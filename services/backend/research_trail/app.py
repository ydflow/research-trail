import asyncio
import platform
import secrets
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, Response
from fastapi import Path as ApiPath
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel
from .conversation import CreateSession, SessionDTO, MessageDTO, StartRun, RunDTO, EventPage, SessionSnapshot
from .database import Database, default_database_path
from .store import Store, MissingRecord, ActiveRun
from .lifecycle import DatabaseLease, RunManager
from .market import FixtureMarketProvider, MarketError, MarketProvider, MarketSnapshot, MarketSymbol, UnknownSymbolError
from .agent import AgentRunner
from .openai_provider import OpenAIModelProvider, ModelError
from .model_provider import FakeModelProvider, ModelProvider
from .tools import market_tools
from .credentials import CredentialUnavailable
from .settings import SettingsService, SettingsError, ConnectionKind, ConnectionInput, ConnectionView, CredentialInput, Profile, Diagnostics
from .provider_contracts import ProviderId, ProviderConfiguration, ProviderCredentials, ProviderProfile, ReadQuery, ProviderResult, CapabilityView
from .provider_settings import ProviderSettings
from .provider_service import ProviderService
from .watchlist import WatchlistStore, WatchlistError
from .security_workspace import SecurityWorkspace
from .workspace_contracts import SymbolInput, WorkspaceState, SecurityQuery, SecurityPage
from .portfolio import PortfolioService, PortfolioError
from .analytics import AnalyticsService, AnalyticsError
from .analytics_contracts import RiskQuery, CompareQuery, RiskReport, Comparison
from .conversation import RiskToolData, CompareToolData
from .capabilities import CapabilityState
from .skills import SkillCatalog, SkillError
from .skill_contracts import SkillView, SkillToggle, SkillRead, SkillResource
from .research import ResearchService
from .research_store import ResearchError
from .research_strategies import strategies as research_strategies
from .research_contracts import ResearchInput, ResearchPlan, ResearchStrategy, ResearchSummary, ResearchRun, ResearchData
from .reports import ReportService
from .research_recovery import ResearchRecovery
from .research_contracts import RecoveryAction, RecoveryView
from .report_contracts import ReportGenerate, ReportSummary, ReportJob, ReportOriginal, ReportMarkdown, ReportDiff, ReportDiffInput
from .report_output import markdown as report_markdown, diff as report_diff
from .theses import ThesisService
from .screening import ScreeningService, ScreeningError
from .screening_contracts import ScreeningContext, ScreeningInput, ScreeningTask, ScreeningRun, ScreeningSummary, ScreeningEvidence
from .calendar import CalendarService, CalendarError
from .monitoring import MonitoringService, MonitoringError
from .evaluation import EvaluationService, EvaluationError
from .research_evaluation import ResearchEvaluationService, RUBRIC
from .research_evaluation_contracts import (ResearchComparisonInput, ResearchComparisonView,
    ResearchQualityInput, ResearchRubric)
from .evaluation_cases import CASES
from .outcomes import OutcomeService, OutcomeError
from .outcome_contracts import (OutcomeCapture, OutcomeOpinion, OutcomeRequest, OutcomeAttempt,
    OutcomeView, WeightChange, WeightVersion, WeightHistory, PerformanceQuery, PerformanceSnapshot)
from .evaluation_trace import EvaluationTracing
from .evaluation_contracts import (EvaluationCase, ExperimentInput, ExperimentView, ExperimentSummary, BaselineInput, BaselineView, BaselineSummary,
    FeedbackInput, FeedbackView, TraceProvider, TraceConfig, TraceConfigView, TraceCredential,
    TracePreview, TraceUpload, TraceDelivery, TraceProbe)
from .monitoring_contracts import (RuleInput, RuleToggle, RuleView, MonitorRun, TodayInput, TodayView,
    NotificationResult, MonitorResearchInput, MonitorResearchAction)
from .calendar_contracts import CalendarSelection, CalendarRefresh, CalendarViewInput, CalendarSource, CalendarPage, CalendarSummary, CalendarOriginal
from uuid import UUID
from .thesis_contracts import (ThesisCreate, ThesisEdit, ThesisEvaluate, ThesisJudge,
    ThesisSummary, ThesisView, ThesisVersion, ThesisReview)
from .portfolio_contracts import (PortfolioInfo, PortfolioView, PortfolioCreate, PortfolioId,
    CsvPreviewInput, ImportPreview, ImportConfirm, ImportUndo)


class Health(BaseModel):
    status: str = "ok"
    service: str = "research-trail"
    python_version: str


def create_app(token: str, market_provider: MarketProvider | None = None, *,
               database_path: Path | str | None = None, model_provider: ModelProvider | None = None,
               run_timings=None, credential_vault=None, openai_transport=None, provider_options=None, skills_root=None, research_options=None, report_options=None, screening_options=None, calendar_options=None, monitoring_options=None, evaluation_options=None, trace_options=None, outcome_options=None) -> FastAPI:
    if len(token) < 32:
        raise ValueError("启动令牌缺失或过短；请由 Electron 启动服务。")
    @asynccontextmanager
    async def lifespan(app):
        database = Database(database_path if database_path is not None else default_database_path())
        lease = None
        manager = None
        try:
            lease = DatabaseLease(database.path)
            database.migrate()
            app.state.store = Store(database)
            app.state.settings = SettingsService(database, credential_vault)
            app.state.evaluation = EvaluationService(database,**(evaluation_options or {}))
            app.state.evaluation_tracing = EvaluationTracing(database,app.state.settings,app.state.evaluation,**(trace_options or {}))
            app.state.provider_settings = ProviderSettings(app.state.settings)
            app.state.providers = ProviderService(app.state.provider_settings, registry=runner.tools.capabilities, **(provider_options or {}))
            app.state.capabilities = runner.tools.capabilities
            app.state.capabilities.providers = app.state.providers
            app.state.providers.registry = app.state.capabilities
            app.state.skills = SkillCatalog(database, app.state.capabilities, skills_root)
            runner.tools.skills = app.state.skills
            app.state.watchlist = WatchlistStore(database)
            app.state.screening = ScreeningService(database,app.state.capabilities,app.state.providers,app.state.watchlist,**(screening_options or {}))
            app.state.calendar = CalendarService(database,app.state.capabilities,app.state.providers,**(calendar_options or {}))
            app.state.security_workspace = SecurityWorkspace(app.state.watchlist,app.state.providers)
            app.state.portfolios = PortfolioService(database,app.state.providers)
            app.state.analytics = AnalyticsService(app.state.portfolios,app.state.providers)
            app.state.research = ResearchService(database,app.state.capabilities,app.state.skills,app.state.providers,calendar=app.state.calendar,**(research_options or {}))
            def report_model():
                with app.state.settings.lock:
                    config=app.state.settings.model_configuration()
                    model=OpenAIModelProvider(config,transport=openai_transport)
                    model.settings_identity=app.state.settings.model_identity()
                    return model
            app.state.reports = ReportService(database,app.state.research.store,report_model,**(report_options or {}))
            app.state.research_evaluation = ResearchEvaluationService(database,app.state.research.store,
                app.state.settings,transport=openai_transport)
            app.state.outcomes = OutcomeService(database,app.state.providers,app.state.reports,**(outcome_options or {}))
            app.state.theses = ThesisService(database, app.state.reports)
            app.state.recovery = ResearchRecovery(app.state.research,app.state.reports,app.state.settings)
            app.state.store.recover_interrupted()
            manager = app.state.manager = RunManager(app.state.store, runner, run_timings)
            app.state.monitoring = MonitoringService(database,app.state.capabilities,app.state.providers,
                app.state.calendar,app.state.watchlist,app.state.portfolios,app.state.research,app.state.reports,
                app.state.theses,**(monitoring_options or {}))
            yield
        finally:
            try:
                if hasattr(app.state,'outcomes'):
                    app.state.outcomes.close()
                if hasattr(app.state,'research_evaluation'):
                    app.state.research_evaluation.close()
                if hasattr(app.state,'evaluation'):
                    app.state.evaluation.close()
                if hasattr(app.state,'monitoring'):
                    app.state.monitoring.close()
                if hasattr(app.state,'screening'):
                    app.state.screening.close()
                if hasattr(app.state,'reports'):
                    app.state.reports.close()
                if hasattr(app.state,'research'):
                    app.state.research.close()
                if hasattr(app.state,'analytics'):
                    app.state.analytics.close()
                if hasattr(app.state,'portfolios'):
                    app.state.portfolios.close()
                if hasattr(app.state,'providers'):
                    app.state.providers.close()
                if manager:
                    manager.shutdown()
            finally:
                database.close()
                if lease:
                    lease.close()

    # Schema export only constructs the app; it never opens a database.
    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan)
    provider = market_provider if market_provider is not None else FixtureMarketProvider()
    runner = AgentRunner(model_provider if model_provider is not None else FakeModelProvider(), market_tools(provider))
    runner.tools.register('portfolio.risk',lambda args: RiskToolData(report=app.state.analytics.risk(args)))
    runner.tools.register('stocks.compare',lambda args: CompareToolData(report=app.state.analytics.compare(args)))

    def authorize(x_researchtrail_token: Annotated[str | None, Header()] = None):
        if not secrets.compare_digest(x_researchtrail_token or "", token):
            raise HTTPException(status_code=401, detail="Invalid startup token")

    @app.exception_handler(MissingRecord)
    async def missing_record(_request, error):
        return JSONResponse(status_code=404, content={"detail": str(error)})

    @app.exception_handler(ActiveRun)
    async def active_run(_request, error):
        return JSONResponse(status_code=409, content={"detail": str(error)})

    protected = [Depends(authorize)]

    @app.exception_handler(OutcomeError)
    async def outcome_error(_request,error):
        return JSONResponse(status_code=404 if error.code.endswith('NOT_FOUND') else 409,content={'detail':error.code})
    @app.get('/outcomes/opinions',response_model=list[OutcomeOpinion],dependencies=protected)
    def outcome_opinions(): return app.state.outcomes.opinions()
    @app.post('/outcomes/opinions',response_model=OutcomeOpinion,dependencies=protected)
    def outcome_capture(body:OutcomeCapture): return app.state.outcomes.capture(body)
    @app.get('/outcomes/opinions/{identity}',response_model=OutcomeView,dependencies=protected)
    def outcome_view(identity:UUID): return app.state.outcomes.get(identity)
    @app.post('/outcomes/opinions/{identity}/evaluate',response_model=OutcomeAttempt,dependencies=protected)
    def outcome_evaluate(identity:UUID,body:OutcomeRequest): return app.state.outcomes.evaluate(identity,body)
    @app.get('/outcomes/policies',response_model=WeightHistory,dependencies=protected)
    def outcome_policies(): return app.state.outcomes.policies()
    @app.post('/outcomes/policies',response_model=WeightVersion,dependencies=protected)
    def outcome_policy_change(body:WeightChange): return app.state.outcomes.change(body)
    @app.post('/outcomes/performance',response_model=PerformanceSnapshot,dependencies=protected)
    def outcome_performance(body:PerformanceQuery): return app.state.outcomes.performance(body)
    @app.get('/outcomes/performance/{identity}',response_model=PerformanceSnapshot,dependencies=protected)
    def outcome_snapshot(identity:UUID): return app.state.outcomes.snapshot(identity)

    @app.exception_handler(EvaluationError)
    async def evaluation_error(_request,error):
        return JSONResponse(status_code=404 if error.code.endswith('NOT_FOUND') else 409,content={'detail':error.code})

    @app.get('/evaluation/cases',response_model=list[EvaluationCase],dependencies=protected)
    def evaluation_cases():return CASES
    @app.get('/evaluation/research/rubric',response_model=ResearchRubric,dependencies=protected)
    def research_quality_rubric():return RUBRIC
    @app.get('/evaluation/research',response_model=list[ResearchComparisonView],dependencies=protected)
    def research_comparisons():return app.state.research_evaluation.history()
    @app.post('/evaluation/research',response_model=ResearchComparisonView,dependencies=protected)
    def research_comparison_create(body:ResearchComparisonInput):
        try:return app.state.research_evaluation.create(body)
        except ModelError as error:raise HTTPException(status_code=409,detail=error.error.code) from None
    @app.get('/evaluation/research/{identity}',response_model=ResearchComparisonView,dependencies=protected)
    def research_comparison_view(identity:UUID):return app.state.research_evaluation.get(identity)
    @app.post('/evaluation/research/{identity}/start',response_model=ResearchComparisonView,dependencies=protected)
    def research_comparison_start(identity:UUID):
        try:return app.state.research_evaluation.start(identity)
        except ModelError as error:raise HTTPException(status_code=409,detail=error.error.code) from None
    @app.post('/evaluation/research/{identity}/cancel',response_model=ResearchComparisonView,dependencies=protected)
    def research_comparison_cancel(identity:UUID):return app.state.research_evaluation.cancel(identity)
    @app.post('/evaluation/research/{identity}/reviews',response_model=ResearchComparisonView,dependencies=protected)
    def research_comparison_review(identity:UUID,body:ResearchQualityInput):return app.state.research_evaluation.review(identity,body)
    @app.get('/evaluation/experiments',response_model=list[ExperimentSummary],dependencies=protected)
    def evaluation_experiments():return app.state.evaluation.history()
    @app.post('/evaluation/experiments',response_model=ExperimentView,dependencies=protected)
    def evaluation_create(body:ExperimentInput):return app.state.evaluation.create(body)
    @app.get('/evaluation/experiments/{identity}',response_model=ExperimentView,dependencies=protected)
    def evaluation_experiment(identity:UUID,baseline_id:UUID|None=None):
        return app.state.evaluation.compare(identity,baseline_id) if baseline_id else app.state.evaluation.get(identity)
    @app.post('/evaluation/experiments/{identity}/start',response_model=ExperimentView,dependencies=protected)
    def evaluation_start(identity:UUID):return app.state.evaluation.start(identity)
    @app.post('/evaluation/experiments/{identity}/cancel',response_model=ExperimentView,dependencies=protected)
    def evaluation_cancel(identity:UUID):return app.state.evaluation.cancel(identity)
    @app.get('/evaluation/baselines',response_model=list[BaselineSummary],dependencies=protected)
    def evaluation_baselines():return app.state.evaluation.baselines()
    @app.post('/evaluation/baselines',response_model=BaselineView,dependencies=protected)
    def evaluation_baseline(body:BaselineInput):return app.state.evaluation.baseline(body)
    @app.get('/evaluation/experiments/{identity}/feedback',response_model=list[FeedbackView],dependencies=protected)
    def evaluation_feedback_list(identity:UUID):return app.state.evaluation.feedback_list(identity)
    @app.post('/evaluation/experiments/{identity}/feedback',response_model=FeedbackView,dependencies=protected)
    def evaluation_feedback(identity:UUID,body:FeedbackInput):return app.state.evaluation.feedback(identity,body)
    @app.get('/evaluation/tracing',response_model=list[TraceConfigView],dependencies=protected)
    def evaluation_tracing():return app.state.evaluation_tracing.configurations()
    @app.put('/evaluation/tracing/{provider}',response_model=TraceConfigView,dependencies=protected)
    def evaluation_trace_config(provider:TraceProvider,body:TraceConfig):return app.state.evaluation_tracing.configure(provider,body)
    @app.put('/evaluation/tracing/{provider}/credential',response_model=TraceConfigView,dependencies=protected)
    def evaluation_trace_credential(provider:TraceProvider,body:TraceCredential):return app.state.evaluation_tracing.credential(provider,body)
    @app.delete('/evaluation/tracing/{provider}/credential',response_model=TraceConfigView,dependencies=protected)
    def evaluation_trace_delete(provider:TraceProvider):return app.state.evaluation_tracing.delete_credential(provider)
    @app.post('/evaluation/tracing/{provider}/probe',response_model=TraceConfigView,dependencies=protected)
    def evaluation_trace_probe(provider:TraceProvider,body:TraceProbe):return app.state.evaluation_tracing.probe(provider)
    @app.get('/evaluation/experiments/{identity}/tracing/{provider}/preview',response_model=TracePreview,dependencies=protected)
    def evaluation_trace_preview(identity:UUID,provider:TraceProvider):return app.state.evaluation_tracing.preview(provider,identity)
    @app.post('/evaluation/experiments/{identity}/tracing/{provider}/upload',response_model=TraceDelivery,dependencies=protected)
    def evaluation_trace_upload(identity:UUID,provider:TraceProvider,body:TraceUpload):return app.state.evaluation_tracing.upload(provider,identity,body)
    @app.get('/evaluation/tracing/deliveries',response_model=list[TraceDelivery],dependencies=protected)
    def evaluation_trace_deliveries():return app.state.evaluation_tracing.deliveries()

    @app.exception_handler(MonitoringError)
    async def monitoring_error(_request,error):
        return JSONResponse(status_code=404 if error.code.endswith('NOT_FOUND') else 409,content={'detail':error.code})

    @app.get('/monitoring/rules',response_model=list[RuleView],dependencies=protected)
    def monitoring_rules(): return app.state.monitoring.rules()

    @app.post('/monitoring/rules',response_model=RuleView,dependencies=protected)
    def monitoring_create(body: RuleInput): return app.state.monitoring.create(body)

    @app.put('/monitoring/rules/{identity}/enabled',response_model=RuleView,dependencies=protected)
    def monitoring_toggle(identity: UUID,body: RuleToggle): return app.state.monitoring.toggle(identity,body.enabled)

    @app.get('/monitoring/runs',response_model=list[MonitorRun],dependencies=protected)
    def monitoring_runs(): return app.state.monitoring.history()

    @app.get('/monitoring/notifications',response_model=list[MonitorRun],dependencies=protected)
    def monitoring_notifications(): return app.state.monitoring.pending_notifications()

    @app.post('/monitoring/notifications/{identity}/claim',response_model=MonitorRun | None,dependencies=protected)
    def monitoring_claim(identity: UUID): return app.state.monitoring.claim_notification(identity)

    @app.post('/monitoring/notifications/{identity}/result',response_model=MonitorRun,dependencies=protected)
    def monitoring_delivery(identity: UUID,body: NotificationResult): return app.state.monitoring.finish_notification(identity,body.status)

    @app.post('/monitoring/runs/{identity}/research',response_model=MonitorResearchAction,dependencies=protected)
    def monitoring_research(identity: UUID,body: MonitorResearchInput): return app.state.monitoring.start_research(identity,body)

    @app.post('/today',response_model=TodayView,dependencies=protected)
    def today(body: TodayInput): return app.state.monitoring.today(body)

    @app.exception_handler(CalendarError)
    async def calendar_error(_request,error):
        return JSONResponse(status_code=404 if str(error).endswith('NOT_FOUND') else 409,content={'detail':str(error)})

    @app.post('/calendar/sources',response_model=list[CalendarSource],dependencies=protected)
    def calendar_sources(query: CalendarSelection): return app.state.calendar.sources(query)

    @app.post('/calendar/snapshots',response_model=CalendarPage,dependencies=protected)
    def calendar_refresh(query: CalendarRefresh): return app.state.calendar.refresh(query)

    @app.get('/calendar/snapshots',response_model=list[CalendarSummary],dependencies=protected)
    def calendar_list(): return app.state.calendar.list()

    @app.post('/calendar/snapshots/{identity}/view',response_model=CalendarPage,dependencies=protected)
    def calendar_view(identity: UUID,query: CalendarViewInput): return app.state.calendar.view(identity,query.timezone)

    @app.get('/calendar/snapshots/{identity}/reads/{read_id}',response_model=CalendarOriginal,dependencies=protected)
    def calendar_original(identity: UUID,read_id: UUID): return app.state.calendar.original(identity,read_id)

    @app.exception_handler(ScreeningError)
    async def screening_error(_request,error):
        return JSONResponse(status_code=404 if str(error)=='SCREENING_NOT_FOUND' else 409,content={'detail':str(error)})

    @app.post('/screening/tasks',response_model=list[ScreeningTask],dependencies=protected)
    def screening_tasks(query: ScreeningContext): return app.state.screening.tasks(query)

    @app.post('/screening/runs',response_model=ScreeningRun,dependencies=protected)
    def screening_start(query: ScreeningInput): return app.state.screening.start(query)

    @app.get('/screening/runs',response_model=list[ScreeningSummary],dependencies=protected)
    def screening_list(): return app.state.screening.list()

    @app.get('/screening/runs/{identity}',response_model=ScreeningRun,dependencies=protected)
    def screening_get(identity: UUID): return app.state.screening.get(identity)

    @app.post('/screening/runs/{identity}/cancel',response_model=ScreeningRun,dependencies=protected)
    def screening_cancel(identity: UUID): return app.state.screening.cancel(identity)

    @app.get('/screening/runs/{identity}/evidence/{read_id}',response_model=ScreeningEvidence,dependencies=protected)
    def screening_evidence(identity: UUID,read_id: UUID): return app.state.screening.evidence(identity,read_id)

    @app.middleware("http")
    async def protect_settings_errors(request, call_next):
        try:
            return await call_next(request)
        except Exception:
            if request.url.path.startswith(("/settings", "/providers", "/workspace", "/portfolios", "/analytics", "/skills", "/capabilities", "/research")):
                # Do not let an injected/native/storage exception echo the request in logs.
                return JSONResponse(status_code=503, content={"detail": "本机存储操作失败，请检查环境后重试。"})
            raise

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, error):
        if request.url.path.startswith(("/settings", "/providers", "/workspace", "/portfolios", "/analytics")):
            # FastAPI's default errors include the raw rejected input, including secrets.
            return JSONResponse(status_code=422, content={"detail": "设置输入不符合契约，请检查字段、长度与地址格式。"})
        return JSONResponse(status_code=422, content={"detail": [{"loc": list(item["loc"]),
                            "type": item["type"], "msg": item["msg"]} for item in error.errors()]})

    @app.exception_handler(CredentialUnavailable)
    async def vault_error(_request, _error):
        return JSONResponse(status_code=503, content={"detail": "系统凭证存储不可用；未回退到明文存储。"})

    @app.exception_handler(SettingsError)
    async def settings_error(_request, error):
        return JSONResponse(status_code=409, content={"detail": str(error)})

    @app.exception_handler(SkillError)
    async def skill_error(_request, error):
        return JSONResponse(status_code=409, content={'detail': error.code})

    @app.exception_handler(ResearchError)
    async def research_error(_request,error):
        return JSONResponse(status_code=404 if error.code in ('RESEARCH_NOT_FOUND','REPORT_NOT_FOUND','THESIS_NOT_FOUND','THESIS_VERSION_NOT_FOUND','THESIS_REVIEW_NOT_FOUND') else 409,content={'detail':error.code})

    @app.get('/theses', response_model=list[ThesisSummary], dependencies=protected)
    def theses(): return app.state.theses.list()

    @app.post('/theses', response_model=ThesisView, dependencies=protected)
    def create_thesis(body: ThesisCreate): return app.state.theses.create(body)

    @app.get('/theses/{identity}', response_model=ThesisView, dependencies=protected)
    def thesis(identity: str): return app.state.theses.get(identity)

    @app.get('/theses/{identity}/versions/{version}', response_model=ThesisVersion, dependencies=protected)
    def thesis_version(identity: str, version: Annotated[int, ApiPath(ge=1)]):
        return app.state.theses.version(identity, version)

    @app.post('/theses/{identity}/edit', response_model=ThesisView, dependencies=protected)
    def edit_thesis(identity: str, body: ThesisEdit): return app.state.theses.edit(identity, body)

    @app.post('/theses/{identity}/evaluate', response_model=ThesisReview, dependencies=protected)
    def evaluate_thesis(identity: str, body: ThesisEvaluate): return app.state.theses.evaluate(identity, body)

    @app.post('/theses/{identity}/judge', response_model=ThesisView, dependencies=protected)
    def judge_thesis(identity: str, body: ThesisJudge): return app.state.theses.judge(identity, body)

    @app.get('/theses/{identity}/reviews/{review_id}', response_model=ThesisReview, dependencies=protected)
    def thesis_review(identity: str, review_id: str): return app.state.theses.review(identity, review_id)

    @app.get('/research/reports',response_model=list[ReportSummary],dependencies=protected)
    def reports(run_id: str | None=None):
        if run_id is not None: app.state.research.store.get(run_id)
        return app.state.reports.store.list(run_id)

    @app.post('/research/runs/{identity}/reports',response_model=ReportJob,dependencies=protected)
    def generate_report(identity: str,body: ReportGenerate):
        return app.state.reports.start(identity,body)

    @app.get('/research/reports/{identity}',response_model=ReportJob,dependencies=protected)
    def get_report(identity: str):
        return app.state.reports.store.get(identity)

    @app.post('/research/reports/{identity}/cancel',response_model=ReportJob,dependencies=protected)
    def cancel_report(identity: str):
        return app.state.reports.cancel(identity)

    @app.get('/research/reports/{identity}/evidence/{reference}',response_model=ReportOriginal,dependencies=protected)
    def report_evidence(identity: str,reference: str):
        return app.state.reports.evidence(identity,reference)

    @app.get('/research/reports/{identity}/markdown',response_model=ReportMarkdown,dependencies=protected)
    def export_report(identity: str):
        return report_markdown(app.state.reports.completed(identity))

    @app.post('/research/report-diff',response_model=ReportDiff,dependencies=protected)
    def compare_reports(body: ReportDiffInput):
        return report_diff(app.state.reports.completed(body.before_id),app.state.reports.completed(body.after_id))

    @app.get('/research/strategies',response_model=list[ResearchStrategy],dependencies=protected)
    def strategies():
        return research_strategies()

    @app.get('/research/runs/{identity}/checkpoint',response_model=RecoveryView,dependencies=protected)
    def research_checkpoint(identity: str):
        return app.state.recovery.inspect(identity)

    @app.post('/research/runs/{identity}/resume',response_model=ResearchRun,dependencies=protected)
    def resume_research(identity: str,body: RecoveryAction):
        return app.state.recovery.resume(identity,body)

    @app.post('/research/runs/{identity}/restart',response_model=ResearchRun,dependencies=protected)
    def restart_research(identity: str,body: RecoveryAction):
        return app.state.recovery.restart(identity,body)

    @app.post('/research/runs/{identity}/abandon',response_model=ResearchRun,dependencies=protected)
    def abandon_research(identity: str,body: RecoveryAction):
        return app.state.recovery.abandon(identity,body)

    @app.post('/research/plan',response_model=ResearchPlan,dependencies=protected)
    def research_plan(body: ResearchInput):
        return app.state.research.plan(body)

    @app.get('/research/runs',response_model=list[ResearchSummary],dependencies=protected)
    def research_runs():
        return app.state.research.store.list()

    @app.post('/research/runs',response_model=ResearchRun,dependencies=protected)
    def start_research(body: ResearchInput):
        return app.state.research.start(body)

    @app.get('/research/runs/{identity}',response_model=ResearchRun,dependencies=protected)
    def get_research(identity: str):
        return app.state.research.store.get(identity)

    @app.post('/research/runs/{identity}/cancel',response_model=ResearchRun,dependencies=protected)
    def cancel_research(identity: str):
        return app.state.research.cancel(identity)

    @app.get('/research/runs/{identity}/data/{capability}',response_model=ResearchData,dependencies=protected)
    def research_data(identity: str,capability: str):
        return app.state.research.store.data(identity,capability)

    @app.get('/capabilities', response_model=list[CapabilityState], dependencies=protected)
    def capabilities(mode: Literal['simulated', 'real'] = 'simulated', provider: ProviderId = 'longbridge'):
        return app.state.capabilities.list(mode, provider)

    @app.get('/skills', response_model=list[SkillView], dependencies=protected)
    def skills(mode: Literal['simulated', 'real'] = 'simulated', provider: ProviderId = 'longbridge'):
        return app.state.skills.list(mode, provider)

    @app.put('/skills/{identity}/enabled', response_model=SkillView, dependencies=protected)
    def skill_enable(identity: str, body: SkillToggle):
        return app.state.skills.set_enabled(identity, body.enabled, body.mode, body.provider)

    @app.post('/skills/{identity}/resource', response_model=SkillResource, dependencies=protected)
    def skill_resource(identity: str, body: SkillRead):
        return app.state.skills.read(identity, body.path, body.mode, body.provider)

    @app.exception_handler(WatchlistError)
    async def watchlist_error(_request,error):
        return JSONResponse(status_code=409,content={'detail':str(error)})

    @app.get('/workspace',response_model=WorkspaceState,dependencies=protected)
    def workspace_state():
        return app.state.watchlist.state()

    @app.exception_handler(PortfolioError)
    async def portfolio_error(_request,error):
        return JSONResponse(status_code=409,content={'detail':str(error)})

    @app.get('/portfolios',response_model=list[PortfolioInfo],dependencies=protected)
    def portfolio_list(): return app.state.portfolios.list()

    @app.exception_handler(AnalyticsError)
    async def analytics_error(_request,error):
        return JSONResponse(status_code=503,content={'detail':str(error)})

    @app.post('/analytics/risk',response_model=RiskReport,dependencies=protected)
    def portfolio_risk(body:RiskQuery): return app.state.analytics.risk(body)

    @app.post('/analytics/compare',response_model=Comparison,dependencies=protected)
    def compare_stocks(body:CompareQuery): return app.state.analytics.compare(body)

    @app.post('/portfolios',response_model=PortfolioView,dependencies=protected)
    def portfolio_create(body:PortfolioCreate): return app.state.portfolios.create(body)

    @app.post('/portfolios/view',response_model=PortfolioView,dependencies=protected)
    def portfolio_view(body:PortfolioId): return app.state.portfolios.view(body.portfolio_id)

    @app.post('/portfolios/preview',response_model=ImportPreview,dependencies=protected)
    def portfolio_preview(body:CsvPreviewInput): return app.state.portfolios.preview(body)

    @app.post('/portfolios/confirm',response_model=PortfolioView,dependencies=protected)
    def portfolio_confirm(body:ImportConfirm): return app.state.portfolios.confirm(body)

    @app.post('/portfolios/undo',response_model=PortfolioView,dependencies=protected)
    def portfolio_undo(body:ImportUndo): return app.state.portfolios.undo(body)

    @app.post('/portfolios/refresh',response_model=PortfolioView,dependencies=protected)
    def portfolio_refresh(body:PortfolioId): return app.state.portfolios.refresh(body.portfolio_id)

    @app.post('/workspace/watchlist',response_model=WorkspaceState,dependencies=protected)
    def add_watch(body:SymbolInput):
        return app.state.watchlist.add(body.symbol)

    @app.post('/workspace/watchlist/remove',response_model=WorkspaceState,dependencies=protected)
    def remove_watch(body:SymbolInput):
        return app.state.watchlist.delete(body.symbol)

    @app.put('/workspace/selection',response_model=WorkspaceState,dependencies=protected)
    def select_security(body:SymbolInput):
        return app.state.watchlist.select(body.symbol)

    @app.post('/workspace/page',response_model=SecurityPage,dependencies=protected)
    def security_page(body:SecurityQuery):
        return app.state.security_workspace.page(body)

    @app.get("/settings/connections", response_model=list[ConnectionView], dependencies=protected)
    def connections():
        return app.state.settings.connections()

    @app.put("/settings/connections/{kind}", response_model=ConnectionView, dependencies=protected)
    def save_connection(kind: ConnectionKind, body: ConnectionInput):
        return app.state.settings.save(kind, body)

    @app.delete("/settings/connections/{kind}", response_model=ConnectionView, dependencies=protected)
    def delete_connection(kind: ConnectionKind):
        return app.state.settings.delete(kind)

    @app.put("/settings/connections/{kind}/credential", response_model=ConnectionView, dependencies=protected)
    def save_credential(kind: ConnectionKind, body: CredentialInput):
        return app.state.settings.credential(kind, body)

    @app.delete("/settings/connections/{kind}/credential", response_model=ConnectionView, dependencies=protected)
    def delete_credential(kind: ConnectionKind):
        return app.state.settings.delete_credential(kind)

    @app.post("/settings/connections/{kind}/test", response_model=ConnectionView, dependencies=protected)
    def test_connection(kind: ConnectionKind):
        return app.state.settings.test(kind)

    @app.get("/settings/profile", response_model=Profile, dependencies=protected)
    def profile():
        return app.state.settings.profile()

    @app.put("/settings/profile", response_model=Profile, dependencies=protected)
    def save_profile(body: Profile):
        return app.state.settings.save_profile(body)

    @app.delete("/settings/profile", response_model=Profile, dependencies=protected)
    def delete_profile():
        return app.state.settings.delete_profile()

    @app.get("/settings/diagnostics", response_model=Diagnostics, dependencies=protected)
    def diagnostics():
        return app.state.settings.diagnostics()

    @app.get('/settings/providers',response_model=list[ProviderProfile],dependencies=protected)
    def provider_profiles():
        return app.state.provider_settings.profiles()

    @app.put('/settings/providers/{provider}',response_model=ProviderProfile,dependencies=protected)
    def save_provider(provider:ProviderId,body:ProviderConfiguration):
        result=app.state.provider_settings.save(provider,body)
        app.state.providers.invalidate(provider)
        return result

    @app.delete('/settings/providers/{provider}',response_model=ProviderProfile,dependencies=protected)
    def delete_provider(provider:ProviderId):
        result=app.state.provider_settings.delete(provider)
        app.state.providers.invalidate(provider)
        return result

    @app.put('/settings/providers/{provider}/credential',response_model=ProviderProfile,dependencies=protected)
    def provider_credential(provider:ProviderId,body:ProviderCredentials):
        result=app.state.provider_settings.credentials(provider,body)
        app.state.providers.invalidate(provider)
        return result

    @app.delete('/settings/providers/{provider}/credential',response_model=ProviderProfile,dependencies=protected)
    def delete_provider_credential(provider:ProviderId):
        result=app.state.provider_settings.delete_credentials(provider)
        app.state.providers.invalidate(provider)
        return result

    @app.get('/providers/capabilities',response_model=list[CapabilityView],dependencies=protected)
    def provider_capabilities():
        return app.state.providers.capabilities()

    @app.post('/providers/{provider}/query',response_model=ProviderResult,dependencies=protected)
    def provider_query(provider:ProviderId,body:ReadQuery):
        return app.state.providers.query(provider,body)

    @app.post("/sessions", response_model=SessionDTO, status_code=201, dependencies=protected)
    def create_session(body: CreateSession):
        return app.state.store.create_session(body.title)

    @app.get("/sessions", response_model=list[SessionDTO], dependencies=protected)
    def sessions():
        return app.state.store.sessions()

    @app.get("/sessions/{session_id}", response_model=SessionDTO, dependencies=protected)
    def session(session_id: str):
        return app.state.store.session(session_id)

    @app.get("/sessions/{session_id}/snapshot", response_model=SessionSnapshot, dependencies=protected)
    def session_snapshot(session_id: str):
        return app.state.store.snapshot(session_id)

    @app.delete("/sessions/{session_id}", status_code=204, dependencies=protected)
    def delete_session(session_id: str):
        app.state.manager.delete_session(session_id)
        return Response(status_code=204)

    @app.get("/sessions/{session_id}/messages", response_model=list[MessageDTO], dependencies=protected)
    def messages(session_id: str):
        return app.state.store.messages(session_id)

    @app.get("/sessions/{session_id}/runs", response_model=list[RunDTO], dependencies=protected)
    def runs(session_id: str):
        return app.state.store.runs(session_id)

    @app.post("/sessions/{session_id}/runs", response_model=RunDTO, status_code=201, dependencies=protected)
    def start_run(session_id: str, body: StartRun):
        if body.kind == "fake_agent":
            return app.state.manager.start(session_id, body.input, body.scenario)
        if body.kind == "openai_agent":
            from .lifecycle import Timing
            if body.scenario != "normal":
                raise HTTPException(status_code=422, detail="真实模型不使用模拟工具时序。")
            settings = app.state.settings
            with settings.lock:
                rounds, timeout = settings.model_limits()
                try:
                    configuration = settings.model_configuration()
                except ModelError as error:
                    public_error = error.error
                    def configuration():
                        raise ModelError(public_error.code, public_error.message)
            model = OpenAIModelProvider(configuration, transport=openai_transport)
            return app.state.manager.start(session_id, body.input, "normal", kind="openai_agent",
                                          runner=AgentRunner(model, runner.tools, max_tool_rounds=rounds),
                                          timing=Timing(tool_timeout=2, run_timeout=timeout))
        return app.state.store.start_fixture(session_id, body.input)

    @app.get("/sessions/{session_id}/runs/{run_id}", response_model=RunDTO, dependencies=protected)
    def run(session_id: str, run_id: str):
        return app.state.store.run(session_id, run_id)

    @app.post("/sessions/{session_id}/runs/{run_id}/cancel", response_model=RunDTO, dependencies=protected)
    def cancel_run(session_id: str, run_id: str):
        return app.state.manager.cancel(session_id, run_id)

    def event_page(session_id, run_id, after_sequence, limit=500):
        try:
            return app.state.store.events(session_id, run_id, after_sequence, limit)
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error

    @app.get("/sessions/{session_id}/runs/{run_id}/event-log", response_model=EventPage, dependencies=protected)
    def event_log(session_id: str, run_id: str, after_sequence: int = Query(default=0, ge=0),
                  limit: int = Query(default=500, ge=1, le=500)):
        return event_page(session_id, run_id, after_sequence, limit)

    @app.get("/sessions/{session_id}/runs/{run_id}/events", response_class=StreamingResponse,
             responses={200: {"content": {"text/event-stream": {"schema": {"type": "string"}}}}},
             dependencies=protected)
    def stream_events(request: Request, session_id: str, run_id: str, after_sequence: int = Query(default=0, ge=0),
                      last_event_id: Annotated[str | None, Header()] = None, follow: bool = False):
        if last_event_id is not None:
            prefix, separator, cursor = last_event_id.partition(":")
            if prefix != run_id or separator != ":" or len(cursor) > 16 or not cursor.isascii() or not cursor.isdigit():
                raise HTTPException(status_code=400, detail="Last-Event-ID必须是当前运行ID:非负序号。")
            after_sequence = max(after_sequence, int(cursor))
        # Validate before opening SSE, then send only committed immutable records.
        page = event_page(session_id, run_id, after_sequence)
        record = app.state.store.run(session_id, run_id)

        async def frames():
            cursor = after_sequence
            current = page
            heartbeat = asyncio.get_running_loop().time()
            # Ended runs and finite replay keep the original response semantics.
            while True:
                for event in current.events:
                    if await request.is_disconnected():
                        return
                    yield f"id: {event.run_id}:{event.sequence}\nevent: {event.type}\ndata: {event.model_dump_json()}\n\n"
                    cursor = event.sequence
                    if follow and event.type == "run_completed":
                        return
                if not follow or await request.is_disconnected():
                    return
                try:
                    record = await asyncio.to_thread(app.state.store.run, session_id, run_id)
                    if record.status != "running" and cursor >= record.last_sequence:
                        return
                    if asyncio.get_running_loop().time() - heartbeat >= 10:
                        yield ": keep-alive\n\n"
                        heartbeat = asyncio.get_running_loop().time()
                    await asyncio.sleep(0.1)
                    current = await asyncio.to_thread(app.state.store.events, session_id, run_id, cursor)
                except MissingRecord:
                    return  # Session deletion closes its subscription, never recreates it.

        return StreamingResponse(frames(), media_type="text/event-stream",
                                 headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no",
                                          "X-ResearchTrail-Run-Status": record.status,
                                          "X-ResearchTrail-Last-Sequence": str(record.last_sequence)})

    @app.get("/health", response_model=Health, dependencies=[Depends(authorize)])
    def health() -> Health:
        return Health(python_version=platform.python_version())

    @app.get("/market/symbols", response_model=list[MarketSymbol], dependencies=[Depends(authorize)])
    def symbols() -> list[MarketSymbol]:
        return provider.symbols()

    @app.get("/market/snapshot/{symbol}", response_model=MarketSnapshot,
             responses={404: {"model": MarketError}}, dependencies=[Depends(authorize)])
    def snapshot(symbol: str):
        try:
            return provider.snapshot(symbol)
        except UnknownSymbolError:
            error = MarketError(code="UNKNOWN_SYMBOL", symbol=symbol,
                                message=f"未知股票代码：{symbol}。模拟数据仅支持 AAPL.US、NVDA.US、MSFT.US、TSLA.US。")
            return JSONResponse(status_code=404, content=error.model_dump())

    return app
