/** Generated from Python OpenAPI by scripts/contracts.mjs. Do not edit. */
export interface paths {
    "/analytics/compare": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Compare Stocks */
        post: operations["compare_stocks_analytics_compare_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/analytics/risk": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Portfolio Risk */
        post: operations["portfolio_risk_analytics_risk_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/calendar/snapshots": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Calendar List */
        get: operations["calendar_list_calendar_snapshots_get"];
        put?: never;
        /** Calendar Refresh */
        post: operations["calendar_refresh_calendar_snapshots_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/calendar/snapshots/{identity}/reads/{read_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Calendar Original */
        get: operations["calendar_original_calendar_snapshots__identity__reads__read_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/calendar/snapshots/{identity}/view": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Calendar View */
        post: operations["calendar_view_calendar_snapshots__identity__view_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/calendar/sources": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Calendar Sources */
        post: operations["calendar_sources_calendar_sources_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/capabilities": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Capabilities */
        get: operations["capabilities_capabilities_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/evaluation/baselines": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Evaluation Baselines */
        get: operations["evaluation_baselines_evaluation_baselines_get"];
        put?: never;
        /** Evaluation Baseline */
        post: operations["evaluation_baseline_evaluation_baselines_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/evaluation/cases": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Evaluation Cases */
        get: operations["evaluation_cases_evaluation_cases_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/evaluation/experiments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Evaluation Experiments */
        get: operations["evaluation_experiments_evaluation_experiments_get"];
        put?: never;
        /** Evaluation Create */
        post: operations["evaluation_create_evaluation_experiments_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/evaluation/experiments/{identity}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Evaluation Experiment */
        get: operations["evaluation_experiment_evaluation_experiments__identity__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/evaluation/experiments/{identity}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Evaluation Cancel */
        post: operations["evaluation_cancel_evaluation_experiments__identity__cancel_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/evaluation/experiments/{identity}/feedback": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Evaluation Feedback List */
        get: operations["evaluation_feedback_list_evaluation_experiments__identity__feedback_get"];
        put?: never;
        /** Evaluation Feedback */
        post: operations["evaluation_feedback_evaluation_experiments__identity__feedback_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/evaluation/experiments/{identity}/start": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Evaluation Start */
        post: operations["evaluation_start_evaluation_experiments__identity__start_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/evaluation/experiments/{identity}/tracing/{provider}/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Evaluation Trace Preview */
        get: operations["evaluation_trace_preview_evaluation_experiments__identity__tracing__provider__preview_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/evaluation/experiments/{identity}/tracing/{provider}/upload": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Evaluation Trace Upload */
        post: operations["evaluation_trace_upload_evaluation_experiments__identity__tracing__provider__upload_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/evaluation/tracing": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Evaluation Tracing */
        get: operations["evaluation_tracing_evaluation_tracing_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/evaluation/tracing/deliveries": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Evaluation Trace Deliveries */
        get: operations["evaluation_trace_deliveries_evaluation_tracing_deliveries_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/evaluation/tracing/{provider}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Evaluation Trace Config */
        put: operations["evaluation_trace_config_evaluation_tracing__provider__put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/evaluation/tracing/{provider}/credential": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Evaluation Trace Credential */
        put: operations["evaluation_trace_credential_evaluation_tracing__provider__credential_put"];
        post?: never;
        /** Evaluation Trace Delete */
        delete: operations["evaluation_trace_delete_evaluation_tracing__provider__credential_delete"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/evaluation/tracing/{provider}/probe": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Evaluation Trace Probe */
        post: operations["evaluation_trace_probe_evaluation_tracing__provider__probe_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Health */
        get: operations["health_health_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/market/snapshot/{symbol}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Snapshot */
        get: operations["snapshot_market_snapshot__symbol__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/market/symbols": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Symbols */
        get: operations["symbols_market_symbols_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/monitoring/notifications": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Monitoring Notifications */
        get: operations["monitoring_notifications_monitoring_notifications_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/monitoring/notifications/{identity}/claim": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Monitoring Claim */
        post: operations["monitoring_claim_monitoring_notifications__identity__claim_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/monitoring/notifications/{identity}/result": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Monitoring Delivery */
        post: operations["monitoring_delivery_monitoring_notifications__identity__result_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/monitoring/rules": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Monitoring Rules */
        get: operations["monitoring_rules_monitoring_rules_get"];
        put?: never;
        /** Monitoring Create */
        post: operations["monitoring_create_monitoring_rules_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/monitoring/rules/{identity}/enabled": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Monitoring Toggle */
        put: operations["monitoring_toggle_monitoring_rules__identity__enabled_put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/monitoring/runs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Monitoring Runs */
        get: operations["monitoring_runs_monitoring_runs_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/monitoring/runs/{identity}/research": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Monitoring Research */
        post: operations["monitoring_research_monitoring_runs__identity__research_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/outcomes/opinions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Outcome Opinions */
        get: operations["outcome_opinions_outcomes_opinions_get"];
        put?: never;
        /** Outcome Capture */
        post: operations["outcome_capture_outcomes_opinions_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/outcomes/opinions/{identity}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Outcome View */
        get: operations["outcome_view_outcomes_opinions__identity__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/outcomes/opinions/{identity}/evaluate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Outcome Evaluate */
        post: operations["outcome_evaluate_outcomes_opinions__identity__evaluate_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/outcomes/performance": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Outcome Performance */
        post: operations["outcome_performance_outcomes_performance_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/outcomes/performance/{identity}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Outcome Snapshot */
        get: operations["outcome_snapshot_outcomes_performance__identity__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/outcomes/policies": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Outcome Policies */
        get: operations["outcome_policies_outcomes_policies_get"];
        put?: never;
        /** Outcome Policy Change */
        post: operations["outcome_policy_change_outcomes_policies_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/portfolios": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Portfolio List */
        get: operations["portfolio_list_portfolios_get"];
        put?: never;
        /** Portfolio Create */
        post: operations["portfolio_create_portfolios_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/portfolios/confirm": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Portfolio Confirm */
        post: operations["portfolio_confirm_portfolios_confirm_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/portfolios/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Portfolio Preview */
        post: operations["portfolio_preview_portfolios_preview_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/portfolios/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Portfolio Refresh */
        post: operations["portfolio_refresh_portfolios_refresh_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/portfolios/undo": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Portfolio Undo */
        post: operations["portfolio_undo_portfolios_undo_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/portfolios/view": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Portfolio View */
        post: operations["portfolio_view_portfolios_view_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/providers/capabilities": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Provider Capabilities */
        get: operations["provider_capabilities_providers_capabilities_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/providers/{provider}/query": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Provider Query */
        post: operations["provider_query_providers__provider__query_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/research/plan": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Research Plan */
        post: operations["research_plan_research_plan_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/research/report-diff": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Compare Reports */
        post: operations["compare_reports_research_report_diff_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/research/reports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Reports */
        get: operations["reports_research_reports_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/research/reports/{identity}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Report */
        get: operations["get_report_research_reports__identity__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/research/reports/{identity}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Cancel Report */
        post: operations["cancel_report_research_reports__identity__cancel_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/research/reports/{identity}/evidence/{reference}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Report Evidence */
        get: operations["report_evidence_research_reports__identity__evidence__reference__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/research/reports/{identity}/markdown": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Export Report */
        get: operations["export_report_research_reports__identity__markdown_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/research/runs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Research Runs */
        get: operations["research_runs_research_runs_get"];
        put?: never;
        /** Start Research */
        post: operations["start_research_research_runs_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/research/runs/{identity}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Research */
        get: operations["get_research_research_runs__identity__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/research/runs/{identity}/abandon": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Abandon Research */
        post: operations["abandon_research_research_runs__identity__abandon_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/research/runs/{identity}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Cancel Research */
        post: operations["cancel_research_research_runs__identity__cancel_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/research/runs/{identity}/checkpoint": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Research Checkpoint */
        get: operations["research_checkpoint_research_runs__identity__checkpoint_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/research/runs/{identity}/data/{capability}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Research Data */
        get: operations["research_data_research_runs__identity__data__capability__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/research/runs/{identity}/reports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Generate Report */
        post: operations["generate_report_research_runs__identity__reports_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/research/runs/{identity}/restart": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Restart Research */
        post: operations["restart_research_research_runs__identity__restart_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/research/runs/{identity}/resume": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Resume Research */
        post: operations["resume_research_research_runs__identity__resume_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/research/strategies": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Strategies */
        get: operations["strategies_research_strategies_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/screening/runs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Screening List */
        get: operations["screening_list_screening_runs_get"];
        put?: never;
        /** Screening Start */
        post: operations["screening_start_screening_runs_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/screening/runs/{identity}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Screening Get */
        get: operations["screening_get_screening_runs__identity__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/screening/runs/{identity}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Screening Cancel */
        post: operations["screening_cancel_screening_runs__identity__cancel_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/screening/runs/{identity}/evidence/{read_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Screening Evidence */
        get: operations["screening_evidence_screening_runs__identity__evidence__read_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/screening/tasks": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Screening Tasks */
        post: operations["screening_tasks_screening_tasks_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/sessions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Sessions */
        get: operations["sessions_sessions_get"];
        put?: never;
        /** Create Session */
        post: operations["create_session_sessions_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/sessions/{session_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Session */
        get: operations["session_sessions__session_id__get"];
        put?: never;
        post?: never;
        /** Delete Session */
        delete: operations["delete_session_sessions__session_id__delete"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/sessions/{session_id}/messages": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Messages */
        get: operations["messages_sessions__session_id__messages_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/sessions/{session_id}/runs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Runs */
        get: operations["runs_sessions__session_id__runs_get"];
        put?: never;
        /** Start Run */
        post: operations["start_run_sessions__session_id__runs_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/sessions/{session_id}/runs/{run_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Run */
        get: operations["run_sessions__session_id__runs__run_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/sessions/{session_id}/runs/{run_id}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Cancel Run */
        post: operations["cancel_run_sessions__session_id__runs__run_id__cancel_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/sessions/{session_id}/runs/{run_id}/event-log": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Event Log */
        get: operations["event_log_sessions__session_id__runs__run_id__event_log_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/sessions/{session_id}/runs/{run_id}/events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Stream Events */
        get: operations["stream_events_sessions__session_id__runs__run_id__events_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/sessions/{session_id}/snapshot": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Session Snapshot */
        get: operations["session_snapshot_sessions__session_id__snapshot_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/settings/connections": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Connections */
        get: operations["connections_settings_connections_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/settings/connections/{kind}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Save Connection */
        put: operations["save_connection_settings_connections__kind__put"];
        post?: never;
        /** Delete Connection */
        delete: operations["delete_connection_settings_connections__kind__delete"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/settings/connections/{kind}/credential": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Save Credential */
        put: operations["save_credential_settings_connections__kind__credential_put"];
        post?: never;
        /** Delete Credential */
        delete: operations["delete_credential_settings_connections__kind__credential_delete"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/settings/connections/{kind}/test": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Test Connection */
        post: operations["test_connection_settings_connections__kind__test_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/settings/diagnostics": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Diagnostics */
        get: operations["diagnostics_settings_diagnostics_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/settings/profile": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Profile */
        get: operations["profile_settings_profile_get"];
        /** Save Profile */
        put: operations["save_profile_settings_profile_put"];
        post?: never;
        /** Delete Profile */
        delete: operations["delete_profile_settings_profile_delete"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/settings/providers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Provider Profiles */
        get: operations["provider_profiles_settings_providers_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/settings/providers/{provider}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Save Provider */
        put: operations["save_provider_settings_providers__provider__put"];
        post?: never;
        /** Delete Provider */
        delete: operations["delete_provider_settings_providers__provider__delete"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/settings/providers/{provider}/credential": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Provider Credential */
        put: operations["provider_credential_settings_providers__provider__credential_put"];
        post?: never;
        /** Delete Provider Credential */
        delete: operations["delete_provider_credential_settings_providers__provider__credential_delete"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/skills": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Skills */
        get: operations["skills_skills_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/skills/{identity}/enabled": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Skill Enable */
        put: operations["skill_enable_skills__identity__enabled_put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/skills/{identity}/resource": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Skill Resource */
        post: operations["skill_resource_skills__identity__resource_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/theses": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Theses */
        get: operations["theses_theses_get"];
        put?: never;
        /** Create Thesis */
        post: operations["create_thesis_theses_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/theses/{identity}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Thesis */
        get: operations["thesis_theses__identity__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/theses/{identity}/edit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Edit Thesis */
        post: operations["edit_thesis_theses__identity__edit_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/theses/{identity}/evaluate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Evaluate Thesis */
        post: operations["evaluate_thesis_theses__identity__evaluate_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/theses/{identity}/judge": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Judge Thesis */
        post: operations["judge_thesis_theses__identity__judge_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/theses/{identity}/reviews/{review_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Thesis Review */
        get: operations["thesis_review_theses__identity__reviews__review_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/theses/{identity}/versions/{version}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Thesis Version */
        get: operations["thesis_version_theses__identity__versions__version__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/today": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Today */
        post: operations["today_today_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/workspace": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Workspace State */
        get: operations["workspace_state_workspace_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/workspace/page": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Security Page */
        post: operations["security_page_workspace_page_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/workspace/selection": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Select Security */
        put: operations["select_security_workspace_selection_put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/workspace/watchlist": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Add Watch */
        post: operations["add_watch_workspace_watchlist_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/workspace/watchlist/remove": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Remove Watch */
        post: operations["remove_watch_workspace_watchlist_remove_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** Allocation */
        Allocation: {
            /** Market Value */
            market_value: string | null;
            /** Price */
            price: string | null;
            /** Quantity */
            quantity: string;
            /** Symbol */
            symbol: string;
            /** Weight */
            weight: string | null;
        };
        /** AnalysisRead */
        AnalysisRead: {
            /** Capability */
            capability: string;
            /** Code */
            code?: string | null;
            provenance?: components["schemas"]["Provenance"] | null;
            /** Status */
            status: string;
            /** Symbol */
            symbol: string | null;
        };
        /** Assertion */
        Assertion: {
            /** Metric */
            metric: string;
            /** Passed */
            passed: boolean;
            /** Reason */
            reason: string;
            /** Sequence */
            sequence?: number | null;
            /** Stage */
            stage: string;
        };
        /** BaselineInput */
        BaselineInput: {
            /**
             * Experiment Id
             * Format: uuid
             */
            experiment_id: string;
            /** Name */
            name: string;
            /**
             * Request Id
             * Format: uuid
             */
            request_id: string;
        };
        /** BaselineSummary */
        BaselineSummary: {
            /** Created At */
            created_at: string;
            /** Evaluator Version */
            evaluator_version: string;
            /** Experiment Id */
            experiment_id: string;
            /** Id */
            id: string;
            /** Name */
            name: string;
            /** Score */
            score: number;
            /** Suite Hash */
            suite_hash: string;
        };
        /** BaselineView */
        BaselineView: {
            /** Created At */
            created_at: string;
            /** Evaluator Version */
            evaluator_version: string;
            /** Experiment Id */
            experiment_id: string;
            /** Id */
            id: string;
            /** Name */
            name: string;
            /** Results */
            results: components["schemas"]["CaseResult"][];
            /** Score */
            score: number;
            /** Suite Hash */
            suite_hash: string;
        };
        /** CalendarEventView */
        CalendarEventView: {
            /**
             * Conflict
             * @default false
             */
            conflict: boolean;
            /** Description */
            description: string;
            /** Display Date */
            display_date: string | null;
            /** Display Time */
            display_time: string;
            /** Display Timezone */
            display_timezone: string;
            /** Id */
            id: string;
            /**
             * Kind
             * @enum {string}
             */
            kind: "earnings" | "macro" | "central-bank";
            /** Occurred At */
            occurred_at: string | null;
            /**
             * Occurrence Status
             * @enum {string}
             */
            occurrence_status: "announced" | "occurred" | "cancelled" | "postponed" | "unknown";
            /** Pointer */
            pointer: string;
            /**
             * Precision
             * @enum {string}
             */
            precision: "instant" | "date" | "unknown";
            /** Read Id */
            read_id: string;
            /** Related Symbols */
            related_symbols: string[];
            /** Schedule Label */
            schedule_label: string | null;
            /** Scheduled At */
            scheduled_at: string | null;
            /** Source Date */
            source_date: string | null;
            /** Source Event Id */
            source_event_id: string | null;
            /** Source Timezone */
            source_timezone: string | null;
            /** Time Code */
            time_code: string | null;
            /**
             * Time Relation
             * @enum {string}
             */
            time_relation: "upcoming" | "elapsed_unconfirmed" | "occurred" | "cancelled" | "postponed" | "date_only" | "unknown";
            /** Title */
            title: string;
            /** Updated At */
            updated_at: string | null;
        };
        /** CalendarIssue */
        CalendarIssue: {
            /** Code */
            code: string;
            /** Pointer */
            pointer: string;
            /** Read Id */
            read_id: string;
        };
        /** CalendarOriginal */
        CalendarOriginal: {
            read: components["schemas"]["CalendarRead"];
            /** Result */
            result: components["schemas"]["ProviderSuccess"] | components["schemas"]["ProviderFailure"];
            /** Snapshot Id */
            snapshot_id: string;
        };
        /** CalendarPage */
        CalendarPage: {
            /** Duplicate Count */
            duplicate_count: number;
            /** Events */
            events: components["schemas"]["CalendarEventView"][];
            /** Id */
            id: string;
            /** Issues */
            issues: components["schemas"]["CalendarIssue"][];
            /**
             * Label
             * @default 历史事件快照；仅显式刷新更新。预告时间经过不等于已发生，获取时间不是事件时间。
             */
            label: string;
            query: components["schemas"]["CalendarRefresh"];
            /** Reads */
            reads: components["schemas"]["CalendarRead"][];
            /**
             * Reference Time
             * Format: date-time
             */
            reference_time: string;
            /**
             * Saved At
             * Format: date-time
             */
            saved_at: string;
            /** Sources */
            sources: components["schemas"]["CalendarSource"][];
            /**
             * Status
             * @enum {string}
             */
            status: "completed" | "partial" | "failed" | "unavailable";
        };
        /** CalendarRead */
        CalendarRead: {
            /** Code */
            code?: string | null;
            /** Fetched At */
            fetched_at?: string | null;
            /** Id */
            id: string;
            query: components["schemas"]["ReadQuery"];
            /** Result Hash */
            result_hash: string;
            /**
             * Status
             * @enum {string}
             */
            status: "success" | "failed";
        };
        /** CalendarRefresh */
        CalendarRefresh: {
            /**
             * End
             * Format: date
             * @default 2024-01-25
             */
            end: string;
            /** Kinds */
            kinds?: ("earnings" | "macro" | "central-bank")[];
            /**
             * Mode
             * @default simulated
             * @enum {string}
             */
            mode: "simulated" | "real";
            /**
             * Provider
             * @default longbridge
             * @enum {string}
             */
            provider: "longbridge" | "massive";
            /**
             * Request Id
             * Format: uuid
             */
            request_id: string;
            /**
             * Start
             * Format: date
             * @default 2024-01-15
             */
            start: string;
            /**
             * Timezone
             * @default Asia/Shanghai
             */
            timezone: string;
        };
        /** CalendarSelection */
        CalendarSelection: {
            /**
             * Mode
             * @default simulated
             * @enum {string}
             */
            mode: "simulated" | "real";
            /**
             * Provider
             * @default longbridge
             * @enum {string}
             */
            provider: "longbridge" | "massive";
        };
        /** CalendarSource */
        CalendarSource: {
            availability: components["schemas"]["CapabilityState"];
            /** Coverage */
            coverage: string;
            /**
             * Kind
             * @enum {string}
             */
            kind: "earnings" | "macro" | "central-bank";
            /** Name */
            name: string;
        };
        /** CalendarSummary */
        CalendarSummary: {
            /** Event Count */
            event_count: number;
            /** Id */
            id: string;
            /**
             * Mode
             * @enum {string}
             */
            mode: "simulated" | "real";
            /** Provider */
            provider: string;
            /**
             * Saved At
             * Format: date-time
             */
            saved_at: string;
            /** Status */
            status: string;
        };
        /** CalendarViewInput */
        CalendarViewInput: {
            /**
             * Timezone
             * @default Asia/Shanghai
             */
            timezone: string;
        };
        /** CancelledEvent */
        CancelledEvent: {
            /** Message Id */
            message_id: string;
            payload: components["schemas"]["CancelledPayload"];
            /**
             * Protocol Version
             * @default 1
             * @constant
             */
            protocol_version: 1;
            /** Run Id */
            run_id: string;
            /** Sequence */
            sequence: number;
            /** Session Id */
            session_id: string;
            /**
             * Timestamp
             * Format: date-time
             */
            timestamp: string;
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "cancelled";
        };
        /** CancelledPayload */
        CancelledPayload: {
            partial: components["schemas"]["PartialText"];
            /**
             * Reason
             * @constant
             */
            reason: "user";
        };
        /** CapabilityState */
        CapabilityState: {
            /** Available */
            available: boolean;
            /** Code */
            code: string;
            /** Id */
            id: string;
            /** Implemented */
            implemented: boolean;
            /**
             * Mode
             * @enum {string}
             */
            mode: "simulated" | "real";
            /** Provider */
            provider: string;
            /**
             * Tool Exposed
             * @default false
             */
            tool_exposed: boolean;
        };
        /** CapabilityView */
        CapabilityView: {
            /**
             * Capability
             * @enum {string}
             */
            capability: "market.quote" | "market.kline" | "market.intraday" | "market.depth" | "market.trades" | "market.capitalFlow" | "market.sentiment" | "market.status" | "company.profile" | "company.valuation" | "company.financials" | "company.dividends" | "company.earnings" | "company.ratings" | "research.news" | "research.events" | "account.accounts" | "account.portfolio" | "account.positions" | "account.assets" | "account.cashFlow";
            /** Checked At */
            checked_at?: string | null;
            /** Code */
            code?: string | null;
            /**
             * Implemented
             * @default true
             */
            implemented: boolean;
            /**
             * Provider
             * @enum {string}
             */
            provider: "longbridge" | "longbridge-account" | "massive";
            /**
             * Transport
             * @enum {string}
             */
            transport: "sdk" | "cli" | "http";
            /**
             * Validation
             * @default unverified
             * @enum {string}
             */
            validation: "unverified" | "simulated" | "real" | "restricted" | "failed";
        };
        /** CaseResult */
        CaseResult: {
            /** Answer */
            answer?: string | null;
            /**
             * Assertions
             * @default []
             */
            assertions: components["schemas"]["Assertion"][];
            /** Case Id */
            case_id: string;
            /** Code */
            code?: string | null;
            /** Failure Stage */
            failure_stage?: string | null;
            /** Observed Status */
            observed_status?: string | null;
            /** Score */
            score?: number | null;
            /**
             * Status
             * @default not_run
             * @enum {string}
             */
            status: "not_run" | "running" | "cancelled" | "run_error" | "quality_failed" | "passed";
            /**
             * Tool Calls
             * @default 0
             */
            tool_calls: number;
            /**
             * Trace
             * @default []
             */
            trace: {
                [key: string]: unknown;
            }[];
        };
        /** CashInput */
        CashInput: {
            /** Amount */
            amount?: string | null;
            /** Currency */
            currency: string;
        };
        /** CompareCell */
        CompareCell: {
            /** Currency */
            currency?: string | null;
            /** Period */
            period?: string | null;
            /** Reason */
            reason?: string | null;
            /** Value */
            value?: string | null;
        };
        /** CompareQuery */
        CompareQuery: {
            /**
             * Currency
             * @default USD
             */
            currency: string;
            /**
             * Mode
             * @default simulated
             * @enum {string}
             */
            mode: "simulated" | "real";
            /**
             * Provider
             * @default longbridge
             * @enum {string}
             */
            provider: "longbridge" | "massive";
            /**
             * Refresh
             * @default false
             */
            refresh: boolean;
            /**
             * Report Year
             * @default 2023
             */
            report_year: number;
            /** Symbols */
            symbols: string[];
        };
        /** CompareRow */
        CompareRow: {
            /** Cells */
            cells: {
                [key: string]: components["schemas"]["CompareCell"];
            };
            /** Label */
            label: string;
            /** Metric */
            metric: string;
            /** Unit */
            unit: string;
        };
        /** CompareToolData */
        CompareToolData: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            kind: "compare";
            report: components["schemas"]["Comparison"];
        };
        /** Comparison */
        Comparison: {
            /** Calculated At */
            calculated_at: string;
            /** Currency */
            currency: string;
            /** Limitations */
            limitations: string[];
            /**
             * Mode
             * @enum {string}
             */
            mode: "simulated" | "real";
            /**
             * Provider
             * @enum {string}
             */
            provider: "longbridge" | "massive";
            /** Reads */
            reads: components["schemas"]["AnalysisRead"][];
            /** Report Period */
            report_period: string;
            /** Rows */
            rows: components["schemas"]["CompareRow"][];
            /** Snapshot Id */
            snapshot_id: string;
            /**
             * Status
             * @enum {string}
             */
            status: "ready" | "partial" | "missing";
            /** Summary */
            summary: string;
            /** Symbols */
            symbols: string[];
        };
        /** CompletedPayload */
        CompletedPayload: {
            /**
             * Stop Reason
             * @enum {string}
             */
            stop_reason: "completed" | "error" | "cancelled" | "timeout" | "interrupted";
        };
        /** ConnectionInput */
        ConnectionInput: {
            /**
             * Enabled
             * @default true
             */
            enabled: boolean;
            /**
             * Endpoint
             * @default
             */
            endpoint: string;
            /**
             * Fake Result
             * @default success
             * @enum {string}
             */
            fake_result: "success" | "failure" | "invalid";
            /**
             * Max Tool Rounds
             * @default 8
             */
            max_tool_rounds: number;
            /**
             * Model
             * @default
             */
            model: string;
            /**
             * Request Timeout Seconds
             * @default 30
             */
            request_timeout_seconds: number;
            /**
             * Requires Credential
             * @default false
             */
            requires_credential: boolean;
            /**
             * Run Timeout Seconds
             * @default 120
             */
            run_timeout_seconds: number;
        };
        /** ConnectionView */
        ConnectionView: {
            /** Checked At */
            checked_at?: string | null;
            /** Configured */
            configured: boolean;
            /** Credential Present */
            credential_present: boolean;
            /** Detail */
            detail: string;
            /**
             * Enabled
             * @default true
             */
            enabled: boolean;
            /**
             * Endpoint
             * @default
             */
            endpoint: string;
            /**
             * Fake Result
             * @default success
             * @enum {string}
             */
            fake_result: "success" | "failure" | "invalid";
            /**
             * Kind
             * @enum {string}
             */
            kind: "model" | "market" | "account" | "skills" | "runtime";
            /**
             * Max Tool Rounds
             * @default 8
             */
            max_tool_rounds: number;
            /**
             * Model
             * @default
             */
            model: string;
            /** Reason */
            reason: string;
            /**
             * Request Timeout Seconds
             * @default 30
             */
            request_timeout_seconds: number;
            /**
             * Requires Credential
             * @default false
             */
            requires_credential: boolean;
            /** Revision */
            revision: number;
            /**
             * Run Timeout Seconds
             * @default 120
             */
            run_timeout_seconds: number;
            /**
             * Status
             * @enum {string}
             */
            status: "unconfigured" | "untested" | "ready" | "failed" | "invalid" | "disabled";
            /**
             * Test Mode
             * @default fake
             * @constant
             */
            test_mode: "fake";
        };
        /** CreateSession */
        CreateSession: {
            /**
             * Title
             * @default 新会话
             */
            title: string;
        };
        /** CredentialInput */
        CredentialInput: {
            /**
             * Secret
             * Format: password
             */
            secret: string;
        };
        /** CsvPreviewInput */
        CsvPreviewInput: {
            /** Csv Text */
            csv_text: string;
            /** Portfolio Id */
            portfolio_id: string;
        };
        /** CurrencyValue */
        CurrencyValue: {
            /** Assets */
            assets: string | null;
            /** Cash */
            cash: string | null;
            /** Cost */
            cost: string | null;
            /** Currency */
            currency: string;
            /** Holdings Count */
            holdings_count: number;
            /** Known Market Value */
            known_market_value: string;
            /** Market Value */
            market_value: string | null;
            /** Pnl */
            pnl: string | null;
            /** Valued Count */
            valued_count: number;
        };
        /** DailyBrief */
        DailyBrief: {
            /** Attention Count */
            attention_count: number;
            /** Date */
            date: string;
            /**
             * Description
             * @default 已有来源的确定性每日聚合；不消费模型，不给投资影响评分。
             */
            description: string;
            /** Source Counts */
            source_counts: {
                [key: string]: number;
            };
        };
        /** DiagnosticConnection */
        DiagnosticConnection: {
            /** Checked At */
            checked_at: string | null;
            /** Configured */
            configured: boolean;
            /** Credential Present */
            credential_present: boolean;
            /**
             * Kind
             * @enum {string}
             */
            kind: "model" | "market" | "account" | "skills" | "runtime";
            /** Reason */
            reason: string;
            /**
             * Status
             * @enum {string}
             */
            status: "unconfigured" | "untested" | "ready" | "failed" | "invalid" | "disabled";
        };
        /** Diagnostics */
        Diagnostics: {
            /** Connections */
            connections: components["schemas"]["DiagnosticConnection"][];
            /**
             * Credential Storage
             * @default windows-credential-manager
             * @constant
             */
            credential_storage: "windows-credential-manager";
            /** Generated At */
            generated_at: string;
            /**
             * Real Requests Sent
             * @default false
             * @constant
             */
            real_requests_sent: false;
            /**
             * Schema Version
             * @default 1
             * @constant
             */
            schema_version: 1;
            /**
             * Scope
             * @default connection-probes
             * @constant
             */
            scope: "connection-probes";
            /**
             * Test Mode
             * @default fake
             * @constant
             */
            test_mode: "fake";
        };
        /** EmptyPayload */
        EmptyPayload: Record<string, never>;
        /** ErrorEvent */
        ErrorEvent: {
            payload: components["schemas"]["ErrorPayload"];
            /**
             * Protocol Version
             * @default 1
             * @constant
             */
            protocol_version: 1;
            /** Run Id */
            run_id: string;
            /** Sequence */
            sequence: number;
            /** Session Id */
            session_id: string;
            /**
             * Timestamp
             * Format: date-time
             */
            timestamp: string;
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "error";
        };
        /** ErrorPayload */
        ErrorPayload: {
            /** Code */
            code: string;
            /** Message */
            message: string;
            /**
             * Retryable
             * @default false
             */
            retryable: boolean;
        };
        /** EvaluationCase */
        EvaluationCase: {
            /**
             * Category
             * @enum {string}
             */
            category: "normal" | "error" | "recovery" | "regression";
            /** Expected Code */
            expected_code?: string | null;
            /** Expected Tool */
            expected_tool?: string | null;
            /** Id */
            id: string;
            /**
             * Origin
             * @default research-trail
             * @constant
             */
            origin: "research-trail";
            /** Prompt */
            prompt: string;
            /** Purpose */
            purpose: string;
            /** Title */
            title: string;
            /**
             * Version
             * @default 1
             * @constant
             */
            version: 1;
        };
        /** EvaluationComparison */
        EvaluationComparison: {
            /** Baseline Id */
            baseline_id: string;
            /** Comparable */
            comparable: boolean;
            /** Delta */
            delta?: number | null;
            /** Reason */
            reason: string;
            /**
             * Regressed Cases
             * @default []
             */
            regressed_cases: string[];
        };
        /** EventPage */
        EventPage: {
            /** Events */
            events: (components["schemas"]["RunStartedEvent"] | components["schemas"]["MessageStartedEvent"] | components["schemas"]["StatusEvent"] | components["schemas"]["TextDeltaEvent"] | components["schemas"]["MessageCompletedEvent"] | components["schemas"]["RunCompletedEvent"] | components["schemas"]["ToolStartedEvent"] | components["schemas"]["ToolResultEvent"] | components["schemas"]["ErrorEvent"] | components["schemas"]["CancelledEvent"])[];
            /** Last Sequence */
            last_sequence: number;
        };
        /** EventResearchContext */
        EventResearchContext: {
            /**
             * Association
             * @enum {string}
             */
            association: "source" | "user-selected";
            event: components["schemas"]["CalendarEventView"];
            /**
             * Label
             * @default 事件来源快照仅为研究上下文，不证明投资影响；预告不等于已经发生。
             */
            label: string;
            /**
             * Mode
             * @enum {string}
             */
            mode: "simulated" | "real";
            /** Provider */
            provider: string;
            /**
             * Reference Time
             * Format: date-time
             */
            reference_time: string;
            /** Result Hash */
            result_hash: string;
            /** Snapshot Id */
            snapshot_id: string;
            /** Target Symbol */
            target_symbol: string;
        };
        /** EventResearchRef */
        EventResearchRef: {
            /** Event Id */
            event_id: string;
            /**
             * Snapshot Id
             * Format: uuid
             */
            snapshot_id: string;
            /** Timezone */
            timezone?: string | null;
        };
        /** ExperimentInput */
        ExperimentInput: {
            /** Case Ids */
            case_ids: string[];
            /** Name */
            name: string;
            /**
             * Profile
             * @default baseline
             * @enum {string}
             */
            profile: "baseline" | "missing-disclosure" | "wrong-fact" | "missing-tool" | "provider-failure";
            /**
             * Request Id
             * Format: uuid
             */
            request_id: string;
        };
        /** ExperimentSummary */
        ExperimentSummary: {
            /** Counts */
            counts: {
                [key: string]: number;
            };
            /** Created At */
            created_at: string;
            /** Id */
            id: string;
            /** Name */
            name: string;
            /**
             * Profile
             * @enum {string}
             */
            profile: "baseline" | "missing-disclosure" | "wrong-fact" | "missing-tool" | "provider-failure";
            /** Score */
            score: number | null;
            /**
             * Status
             * @enum {string}
             */
            status: "not_run" | "running" | "cancelled" | "run_error" | "quality_failed" | "passed";
            /** Validity */
            validity: string;
        };
        /** ExperimentView */
        ExperimentView: {
            /** Cases */
            cases: components["schemas"]["EvaluationCase"][];
            comparison?: components["schemas"]["EvaluationComparison"] | null;
            /** Completed At */
            completed_at?: string | null;
            /**
             * Counts
             * @default {}
             */
            counts: {
                [key: string]: number;
            };
            /** Created At */
            created_at: string;
            /**
             * Evaluator Version
             * @default rt-engineering-v1
             * @constant
             */
            evaluator_version: "rt-engineering-v1";
            /**
             * Failure Counts
             * @default {}
             */
            failure_counts: {
                [key: string]: number;
            };
            /** Id */
            id: string;
            input: components["schemas"]["ExperimentInput"];
            /**
             * Mode
             * @default deterministic-offline
             * @constant
             */
            mode: "deterministic-offline";
            /**
             * Model Requests
             * @default 0
             * @constant
             */
            model_requests: 0;
            /**
             * Origin Counts
             * @default {}
             */
            origin_counts: {
                [key: string]: number;
            };
            /** Results */
            results: components["schemas"]["CaseResult"][];
            /** Score */
            score?: number | null;
            /**
             * Status
             * @default not_run
             * @enum {string}
             */
            status: "not_run" | "running" | "cancelled" | "run_error" | "quality_failed" | "passed";
            /** Suite Hash */
            suite_hash: string;
            /**
             * Validity
             * @default not_executed
             * @enum {string}
             */
            validity: "not_executed" | "inconclusive" | "invalid" | "valid";
        };
        /** FeedbackInput */
        FeedbackInput: {
            /** Case Id */
            case_id: string;
            /**
             * Judgment
             * @enum {string}
             */
            judgment: "agree" | "disagree" | "needs-review";
            /** Reason */
            reason: string;
            /**
             * Request Id
             * Format: uuid
             */
            request_id: string;
        };
        /** FeedbackView */
        FeedbackView: {
            /** Case Id */
            case_id: string;
            /** Created At */
            created_at: string;
            /** Experiment Id */
            experiment_id: string;
            /** Id */
            id: string;
            /**
             * Judgment
             * @enum {string}
             */
            judgment: "agree" | "disagree" | "needs-review";
            /** Reason */
            reason: string;
            /**
             * Request Id
             * Format: uuid
             */
            request_id: string;
            /**
             * Source
             * @default human
             * @constant
             */
            source: "human";
        };
        /** FinancialRow */
        FinancialRow: {
            /** Currency */
            currency?: string | null;
            /** Label */
            label: string;
            /** Period */
            period?: string | null;
            /**
             * Statement
             * @enum {string}
             */
            statement: "IS" | "BS" | "CF";
            /** Value */
            value?: number | null;
        };
        /** HTTPValidationError */
        HTTPValidationError: {
            /** Detail */
            detail?: components["schemas"]["ValidationError"][];
        };
        /** Health */
        Health: {
            /** Python Version */
            python_version: string;
            /**
             * Service
             * @default research-trail
             */
            service: string;
            /**
             * Status
             * @default ok
             */
            status: string;
        };
        /** HoldingInput */
        HoldingInput: {
            /** Cost Price */
            cost_price?: string | null;
            /** Currency */
            currency: string;
            /** Market Price */
            market_price?: string | null;
            /** Quantity */
            quantity: string;
            /** Symbol */
            symbol: string;
        };
        /** HoldingValue */
        HoldingValue: {
            /** Cost */
            cost?: string | null;
            /** Cost Price */
            cost_price?: string | null;
            /** Currency */
            currency: string;
            /** Market Price */
            market_price?: string | null;
            /** Market Value */
            market_value?: string | null;
            /** Pnl */
            pnl?: string | null;
            /** Pnl Percent */
            pnl_percent?: string | null;
            /** Quantity */
            quantity: string;
            /** Symbol */
            symbol: string;
        };
        /** ImportConfirm */
        ImportConfirm: {
            /** Draft Id */
            draft_id: string;
            /** Portfolio Id */
            portfolio_id: string;
        };
        /** ImportIssue */
        ImportIssue: {
            /** Code */
            code: string;
            /** Line */
            line: number;
            /** Message */
            message: string;
        };
        /** ImportPreview */
        ImportPreview: {
            /** Can Import */
            can_import: boolean;
            /** Draft Id */
            draft_id: string | null;
            /** Duplicate */
            duplicate: boolean;
            /**
             * Expires In Seconds
             * @default 600
             */
            expires_in_seconds: number;
            /** Issues */
            issues: components["schemas"]["ImportIssue"][];
            /** Portfolio Id */
            portfolio_id: string;
            /** Revision */
            revision: number;
            snapshot: components["schemas"]["PortfolioSnapshot"];
            valuation: components["schemas"]["PortfolioView"];
        };
        /** ImportUndo */
        ImportUndo: {
            /** Batch Id */
            batch_id: string;
            /** Portfolio Id */
            portfolio_id: string;
        };
        JsonValue: unknown;
        /** Kline */
        Kline: {
            /** Close */
            close: number;
            /** High */
            high: number;
            /** Low */
            low: number;
            /** Open */
            open: number;
            /**
             * Timestamp
             * @description UTC Unix seconds, never milliseconds
             */
            timestamp: number;
            /** Volume */
            volume: number;
        };
        /** KlineToolData */
        KlineToolData: {
            /**
             * Data Label
             * @constant
             */
            data_label: "模拟数据";
            /**
             * Fetched At
             * Format: date-time
             */
            fetched_at: string;
            /**
             * Fixture Version
             * @constant
             */
            fixture_version: "authored-v1";
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            kind: "kline";
            /** Klines */
            klines: components["schemas"]["Kline"][];
            /**
             * Market Time
             * Format: date-time
             */
            market_time: string;
            /** Name */
            name: string;
            /**
             * Period
             * @constant
             */
            period: "1d";
            /**
             * Source
             * @constant
             */
            source: "fixture";
            /** Symbol */
            symbol: string;
        };
        /** MarketError */
        MarketError: {
            /**
             * Code
             * @constant
             */
            code: "UNKNOWN_SYMBOL";
            /** Message */
            message: string;
            /** Symbol */
            symbol: string;
        };
        /** MarketSnapshot */
        MarketSnapshot: {
            /**
             * Data Label
             * @default 模拟数据
             * @constant
             */
            data_label: "模拟数据";
            /**
             * Fetched At
             * Format: date-time
             */
            fetched_at: string;
            /**
             * Fixture Version
             * @default authored-v1
             * @constant
             */
            fixture_version: "authored-v1";
            /** Klines */
            klines: components["schemas"]["Kline"][];
            /**
             * Market Time
             * Format: date-time
             */
            market_time: string;
            /**
             * Period
             * @default 1d
             * @constant
             */
            period: "1d";
            quote: components["schemas"]["Quote"];
            /**
             * Source
             * @default fixture
             * @constant
             */
            source: "fixture";
        };
        /** MarketSymbol */
        MarketSymbol: {
            /** Name */
            name: string;
            /** Symbol */
            symbol: string;
        };
        /** MessageCompletedEvent */
        MessageCompletedEvent: {
            /** Message Id */
            message_id: string;
            payload: components["schemas"]["EmptyPayload"];
            /**
             * Protocol Version
             * @default 1
             * @constant
             */
            protocol_version: 1;
            /** Run Id */
            run_id: string;
            /** Sequence */
            sequence: number;
            /** Session Id */
            session_id: string;
            /**
             * Timestamp
             * Format: date-time
             */
            timestamp: string;
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "message_completed";
        };
        /** MessageDTO */
        MessageDTO: {
            /** Content */
            content: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Id */
            id: string;
            /**
             * Role
             * @enum {string}
             */
            role: "user" | "assistant";
            /** Run Id */
            run_id: string;
            /** Sequence */
            sequence: number;
            /** Session Id */
            session_id: string;
        };
        /** MessageStartedEvent */
        MessageStartedEvent: {
            /** Message Id */
            message_id: string;
            payload: components["schemas"]["EmptyPayload"];
            /**
             * Protocol Version
             * @default 1
             * @constant
             */
            protocol_version: 1;
            /** Run Id */
            run_id: string;
            /** Sequence */
            sequence: number;
            /** Session Id */
            session_id: string;
            /**
             * Timestamp
             * Format: date-time
             */
            timestamp: string;
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "message_started";
        };
        /** Metric */
        Metric: {
            /** Label */
            label: string;
            /** Unit */
            unit?: string | null;
            /** Value */
            value?: number | string | null;
        };
        /** MonitorResearchAction */
        MonitorResearchAction: {
            /** Code */
            code?: string | null;
            /** Id */
            id: string;
            /** Research Id */
            research_id?: string | null;
            /** Run Id */
            run_id: string;
            /**
             * Status
             * @enum {string}
             */
            status: "claimed" | "dispatched" | "failed" | "uncertain";
            /** Symbol */
            symbol: string;
        };
        /** MonitorResearchInput */
        MonitorResearchInput: {
            /** Symbol */
            symbol: string;
        };
        /** MonitorRun */
        MonitorRun: {
            /** Code */
            code?: string | null;
            /** Completed At */
            completed_at?: string | null;
            /** Id */
            id: string;
            /**
             * Notification Status
             * @default none
             * @enum {string}
             */
            notification_status: "none" | "pending" | "claimed" | "shown" | "failed" | "unsupported" | "uncertain" | "suppressed";
            /**
             * Notified
             * @default false
             */
            notified: boolean;
            /** Occurrence */
            occurrence: string;
            /** Payload */
            payload: {
                [key: string]: unknown;
            };
            /** Rule Id */
            rule_id: string;
            /**
             * Started At
             * Format: date-time
             */
            started_at: string;
            /**
             * Status
             * @enum {string}
             */
            status: "running" | "triggered" | "quiet" | "failed" | "interrupted" | "skipped";
        };
        /** News */
        News: {
            /** Id */
            id: string;
            /** Published At */
            published_at?: string | null;
            /** Source */
            source?: string | null;
            /** Summary */
            summary?: string | null;
            /** Title */
            title?: string | null;
            /** Url */
            url?: string | null;
        };
        /** NotificationResult */
        NotificationResult: {
            /**
             * Status
             * @enum {string}
             */
            status: "shown" | "failed" | "unsupported";
        };
        /** OutcomeAttempt */
        OutcomeAttempt: {
            /** Bars */
            bars?: components["schemas"]["OutcomeBar"][];
            /** Bars Hash */
            bars_hash?: string | null;
            /** Benchmark Return */
            benchmark_return?: null;
            /** Code */
            code: string | null;
            /** Data Hash */
            data_hash?: string | null;
            /** Direction Correct */
            direction_correct?: boolean | null;
            /**
             * Engine Version
             * @default research-trail-outcome-v1
             */
            engine_version: string;
            /** Evaluated At */
            evaluated_at: string | null;
            /** Exit Price */
            exit_price?: string | null;
            /** Id */
            id: string;
            /** Maximum Drawdown */
            maximum_drawdown?: string | null;
            /** Opinion Id */
            opinion_id: string;
            /**
             * Price Basis
             * @default unadjusted-daily-close
             */
            price_basis: string;
            provenance?: components["schemas"]["Provenance"] | null;
            /** Query */
            query?: {
                [key: string]: unknown;
            } | null;
            /** Request Id */
            request_id: string;
            /** Return Percent */
            return_percent?: string | null;
            /** Source Data */
            source_data?: components["schemas"]["JsonValue"][] | null;
            /**
             * Started At
             * Format: date-time
             */
            started_at: string;
            /**
             * Status
             * @enum {string}
             */
            status: "running" | "pending" | "unable" | "evaluated" | "interrupted";
        };
        /** OutcomeBar */
        OutcomeBar: {
            /** Close */
            close: string;
            /** Timestamp */
            timestamp: number;
        };
        /** OutcomeCapture */
        OutcomeCapture: {
            /**
             * Horizon
             * @default 1m
             * @enum {string}
             */
            horizon: "1w" | "1m" | "3m";
            /** Report Id */
            report_id: string;
        };
        /** OutcomeOpinion */
        OutcomeOpinion: {
            /**
             * Analysis Mode
             * @enum {string}
             */
            analysis_mode: "fixed" | "real";
            /**
             * Capture Version
             * @default research-trail-capture-v1
             */
            capture_version: string;
            /**
             * Captured At
             * Format: date-time
             */
            captured_at: string;
            /** Confidence */
            confidence?: null;
            /**
             * Due At
             * Format: date-time
             */
            due_at: string;
            /** Entry Code */
            entry_code: string | null;
            /** Entry Fetched At */
            entry_fetched_at: string | null;
            /** Entry Market At */
            entry_market_at: string | null;
            /** Entry Price */
            entry_price: string | null;
            /** Evidence Ids */
            evidence_ids: string[];
            /**
             * Horizon
             * @enum {string}
             */
            horizon: "1w" | "1m" | "3m";
            /** Id */
            id: string;
            /**
             * Origin
             * @enum {string}
             */
            origin: "prospective" | "retrospective" | "authored-history";
            /**
             * Provider
             * @enum {string}
             */
            provider: "longbridge" | "massive";
            /** Provider Identity */
            provider_identity: string | null;
            /** Provider Revision */
            provider_revision: number;
            /** Report Hash */
            report_hash: string;
            /** Report Id */
            report_id: string;
            /** Report Version */
            report_version: number;
            /**
             * Research At
             * Format: date-time
             */
            research_at: string;
            /** Run Id */
            run_id: string;
            /** Skill Ids */
            skill_ids: string[];
            /**
             * Source Mode
             * @enum {string}
             */
            source_mode: "simulated" | "real";
            /**
             * Stance
             * @enum {string}
             */
            stance: "bullish" | "bearish" | "neutral";
            /** Strategy */
            strategy: string;
            /** Symbol */
            symbol: string;
            /**
             * Window End
             * Format: date-time
             */
            window_end: string;
        };
        /** OutcomeRequest */
        OutcomeRequest: {
            /** Request Id */
            request_id: string;
        };
        /** OutcomeView */
        OutcomeView: {
            /** Attempts */
            attempts: components["schemas"]["OutcomeAttempt"][];
            /**
             * Label
             * @default 不复权日线价格变化及方向匹配，不是账户收益；未计交易成本、分红、拆股或基准超额收益。
             */
            label: string;
            opinion: components["schemas"]["OutcomeOpinion"];
        };
        /** PartialText */
        PartialText: {
            /** Text */
            text: string;
        };
        /** PerformanceQuery */
        PerformanceQuery: {
            /**
             * Analysis Mode
             * @default real
             * @enum {string}
             */
            analysis_mode: "fixed" | "real";
            /** As Of */
            as_of?: string | null;
            /**
             * Horizon
             * @default 1m
             * @enum {string}
             */
            horizon: "1w" | "1m" | "3m";
            /**
             * Origin
             * @default prospective
             * @enum {string}
             */
            origin: "prospective" | "retrospective" | "authored-history";
            /**
             * Source Mode
             * @default real
             * @enum {string}
             */
            source_mode: "simulated" | "real";
        };
        /** PerformanceRow */
        PerformanceRow: {
            /** Adaptive Weight */
            adaptive_weight: string | null;
            /** Average Return */
            average_return: string | null;
            /** Direction Hit Rate */
            direction_hit_rate: string | null;
            /** Evaluation Ids */
            evaluation_ids: string[];
            /** Historical Reliability */
            historical_reliability: string | null;
            /** Insufficient Data */
            insufficient_data: boolean;
            /** Key */
            key: string;
            /**
             * Kind
             * @enum {string}
             */
            kind: "skill" | "strategy";
            /** Median Excess Return */
            median_excess_return?: null;
            /** Pending */
            pending: number;
            /** Sample Confidence */
            sample_confidence: string | null;
            /** Samples */
            samples: number;
            /** Unable */
            unable: number;
            /** Unable Rate */
            unable_rate: string | null;
        };
        /** PerformanceSnapshot */
        PerformanceSnapshot: {
            /**
             * As Of
             * Format: date-time
             */
            as_of: string;
            /** Attempt Ids */
            attempt_ids?: string[];
            /**
             * Calculation Version
             * @default research-trail-calibration-v1
             */
            calculation_version: string;
            filter: components["schemas"]["PerformanceQuery"];
            /** Id */
            id: string;
            /** Input Hash */
            input_hash: string;
            /**
             * Label
             * @default 至少30个有效样本；样本置信度是样本强度，非预测概率。权重仅供参考，不自动改策略。工具正确率不代表盈利能力。
             */
            label: string;
            /** Opinion Ids */
            opinion_ids?: string[];
            /** Policy Version */
            policy_version: number;
            /** Rows */
            rows: components["schemas"]["PerformanceRow"][];
        };
        /** PlannedRead */
        PlannedRead: {
            availability: components["schemas"]["CapabilityState"];
            /** Capability */
            capability: string;
            query: components["schemas"]["ReadQuery"];
        };
        /** PlannedSkill */
        PlannedSkill: {
            /** Code */
            code: string;
            /** Id */
            id: string;
            /**
             * Status
             * @enum {string}
             */
            status: "ready" | "partial" | "unavailable" | "disabled" | "invalid" | "missing";
        };
        /** PortfolioCreate */
        PortfolioCreate: {
            /**
             * Kind
             * @default manual
             * @enum {string}
             */
            kind: "manual" | "simulated" | "read_only";
            /** Name */
            name: string;
        };
        /** PortfolioId */
        PortfolioId: {
            /** Portfolio Id */
            portfolio_id: string;
        };
        /** PortfolioInfo */
        PortfolioInfo: {
            /** Account Id */
            account_id: string;
            /** Account Name */
            account_name: string;
            /** Id */
            id: string;
            /**
             * Kind
             * @enum {string}
             */
            kind: "manual" | "simulated" | "read_only";
            /** Name */
            name: string;
        };
        /** PortfolioSnapshot */
        PortfolioSnapshot: {
            /** Cash */
            cash?: components["schemas"]["CashInput"][];
            /** Holdings */
            holdings?: components["schemas"]["HoldingInput"][];
        };
        /** PortfolioView */
        PortfolioView: {
            /** Account Id */
            account_id: string;
            /** Account Name */
            account_name: string;
            /** Cash Rows */
            cash_rows: components["schemas"]["CashInput"][];
            /** Code */
            code?: string | null;
            /** Currencies */
            currencies: components["schemas"]["CurrencyValue"][];
            /** Holdings */
            holdings: components["schemas"]["HoldingValue"][];
            /** Id */
            id: string;
            /**
             * Kind
             * @enum {string}
             */
            kind: "manual" | "simulated" | "read_only";
            /** Limitations */
            limitations: string[];
            /** Market Time */
            market_time?: string | null;
            /** Message */
            message?: string | null;
            /** Name */
            name: string;
            /** Provenance */
            provenance?: components["schemas"]["Provenance"][];
            /** Reported Net Assets */
            reported_net_assets?: components["schemas"]["CashInput"][];
            /** Revision */
            revision: number;
            /**
             * Source
             * @enum {string}
             */
            source: "csv-snapshot" | "authored-fixture" | "longbridge-account";
            /**
             * Status
             * @enum {string}
             */
            status: "ready" | "partial" | "empty" | "unverified" | "failed" | "restricted" | "unconfigured";
            /** Undo Batch */
            undo_batch?: string | null;
            /** Updated At */
            updated_at?: string | null;
        };
        /** Profile */
        Profile: {
            /**
             * Display Name
             * @default
             */
            display_name: string;
            /**
             * Research Style
             * @default balanced
             * @enum {string}
             */
            research_style: "balanced" | "cautious" | "exploratory";
        };
        /** Provenance */
        Provenance: {
            /**
             * Cached
             * @default false
             */
            cached: boolean;
            /**
             * Credential Source
             * @default none
             * @enum {string}
             */
            credential_source: "none" | "system-store" | "external-cli-session";
            /**
             * Data Label
             * @enum {string}
             */
            data_label: "模拟数据" | "真实数据" | "延迟行情" | "历史行情" | "真实数据（延迟未知）";
            /**
             * Fetched At
             * Format: date-time
             */
            fetched_at: string;
            /** Market Time */
            market_time?: string | null;
            /**
             * Mode
             * @enum {string}
             */
            mode: "simulated" | "real";
            /**
             * Permission
             * @default unknown
             * @enum {string}
             */
            permission: "unknown" | "request-succeeded";
            /**
             * Provider
             * @enum {string}
             */
            provider: "longbridge" | "longbridge-account" | "massive";
            /**
             * Served At
             * Format: date-time
             */
            served_at: string;
            /**
             * Timeliness
             * @enum {string}
             */
            timeliness: "unknown" | "realtime" | "delayed" | "historical";
            /**
             * Timeliness Basis
             * @enum {string}
             */
            timeliness_basis: "fixture" | "historical-request" | "user-declared" | "unknown";
            /**
             * Transport
             * @enum {string}
             */
            transport: "fixture" | "sdk" | "cli" | "http";
        };
        /** ProviderConfiguration */
        ProviderConfiguration: {
            /**
             * Cache Ttl Seconds
             * @default 30
             */
            cache_ttl_seconds: number;
            /**
             * Cli Path
             * @default
             */
            cli_path: string;
            /**
             * Enabled
             * @default true
             */
            enabled: boolean;
            /**
             * Region
             * @default global
             * @enum {string}
             */
            region: "global" | "cn";
            /**
             * Timeliness
             * @default unknown
             * @enum {string}
             */
            timeliness: "unknown" | "realtime" | "delayed" | "historical";
            /**
             * Timeout Seconds
             * @default 15
             */
            timeout_seconds: number;
        };
        /** ProviderCredentials */
        ProviderCredentials: {
            /** Access Token */
            access_token?: string | null;
            /** Api Key */
            api_key?: string | null;
            /** App Key */
            app_key?: string | null;
            /** App Secret */
            app_secret?: string | null;
        };
        /** ProviderFailure */
        ProviderFailure: {
            /**
             * Capability
             * @enum {string}
             */
            capability: "market.quote" | "market.kline" | "market.intraday" | "market.depth" | "market.trades" | "market.capitalFlow" | "market.sentiment" | "market.status" | "company.profile" | "company.valuation" | "company.financials" | "company.dividends" | "company.earnings" | "company.ratings" | "research.news" | "research.events" | "account.accounts" | "account.portfolio" | "account.positions" | "account.assets" | "account.cashFlow";
            /** Code */
            code: string;
            /** Message */
            message: string;
            /**
             * Ok
             * @default false
             * @constant
             */
            ok: false;
            /**
             * Provider
             * @enum {string}
             */
            provider: "longbridge" | "longbridge-account" | "massive";
            /**
             * Retryable
             * @default false
             */
            retryable: boolean;
            /**
             * State
             * @enum {string}
             */
            state: "unconfigured" | "disabled" | "restricted" | "unsupported" | "failed" | "timed_out" | "cancelled";
        };
        /** ProviderProfile */
        ProviderProfile: {
            /**
             * Cache Ttl Seconds
             * @default 30
             */
            cache_ttl_seconds: number;
            /**
             * Cli Path
             * @default
             */
            cli_path: string;
            /** Configured */
            configured: boolean;
            /** Credential Present */
            credential_present: boolean;
            /**
             * Credential Storage
             * @default windows-credential-manager
             * @constant
             */
            credential_storage: "windows-credential-manager";
            /**
             * Enabled
             * @default true
             */
            enabled: boolean;
            /**
             * Provider
             * @enum {string}
             */
            provider: "longbridge" | "longbridge-account" | "massive";
            /**
             * Region
             * @default global
             * @enum {string}
             */
            region: "global" | "cn";
            /** Revision */
            revision: number;
            /**
             * Timeliness
             * @default unknown
             * @enum {string}
             */
            timeliness: "unknown" | "realtime" | "delayed" | "historical";
            /**
             * Timeout Seconds
             * @default 15
             */
            timeout_seconds: number;
        };
        /** ProviderSuccess */
        ProviderSuccess: {
            /**
             * Capability
             * @enum {string}
             */
            capability: "market.quote" | "market.kline" | "market.intraday" | "market.depth" | "market.trades" | "market.capitalFlow" | "market.sentiment" | "market.status" | "company.profile" | "company.valuation" | "company.financials" | "company.dividends" | "company.earnings" | "company.ratings" | "research.news" | "research.events" | "account.accounts" | "account.portfolio" | "account.positions" | "account.assets" | "account.cashFlow";
            data: components["schemas"]["JsonValue"];
            /**
             * Ok
             * @default true
             * @constant
             */
            ok: true;
            provenance: components["schemas"]["Provenance"];
            /**
             * Provider
             * @enum {string}
             */
            provider: "longbridge" | "longbridge-account" | "massive";
            /**
             * State
             * @default ready
             * @constant
             */
            state: "ready";
        };
        /** Quote */
        Quote: {
            /** Change */
            change: number;
            /** Change Percent */
            change_percent: number;
            /**
             * Currency
             * @default USD
             * @constant
             */
            currency: "USD";
            /** High */
            high: number;
            /** Last Price */
            last_price: number;
            /** Low */
            low: number;
            /**
             * Market Time
             * Format: date-time
             */
            market_time: string;
            /** Name */
            name: string;
            /** Open */
            open: number;
            /** Previous Close */
            previous_close: number;
            /** Symbol */
            symbol: string;
            /** Volume */
            volume: number;
        };
        /** QuoteToolData */
        QuoteToolData: {
            /**
             * Data Label
             * @constant
             */
            data_label: "模拟数据";
            /**
             * Fetched At
             * Format: date-time
             */
            fetched_at: string;
            /**
             * Fixture Version
             * @constant
             */
            fixture_version: "authored-v1";
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            kind: "quote";
            /**
             * Market Time
             * Format: date-time
             */
            market_time: string;
            quote: components["schemas"]["Quote"];
            /**
             * Source
             * @constant
             */
            source: "fixture";
        };
        /** ReadQuery */
        ReadQuery: {
            /**
             * Capability
             * @enum {string}
             */
            capability: "market.quote" | "market.kline" | "market.intraday" | "market.depth" | "market.trades" | "market.capitalFlow" | "market.sentiment" | "market.status" | "company.profile" | "company.valuation" | "company.financials" | "company.dividends" | "company.earnings" | "company.ratings" | "research.news" | "research.events" | "account.accounts" | "account.portfolio" | "account.positions" | "account.assets" | "account.cashFlow";
            /**
             * Count
             * @default 20
             */
            count: number;
            /** End */
            end?: string | null;
            /**
             * Event Type
             * @default financial
             * @enum {string}
             */
            event_type: "financial" | "report" | "dividend" | "ipo" | "macrodata" | "closed";
            /**
             * Kind
             * @default ALL
             * @enum {string}
             */
            kind: "IS" | "BS" | "CF" | "ALL";
            /**
             * Market
             * @default US
             * @enum {string}
             */
            market: "US" | "HK" | "CN" | "SG";
            /**
             * Mode
             * @default simulated
             * @enum {string}
             */
            mode: "simulated" | "real";
            /**
             * Period
             * @default 1d
             * @enum {string}
             */
            period: "1m" | "5m" | "15m" | "1h" | "1d" | "1w";
            /** Report */
            report?: string | null;
            /** Start */
            start?: string | null;
            /** Symbol */
            symbol?: string | null;
            /**
             * Use Cache
             * @default true
             */
            use_cache: boolean;
        };
        /** RecoveryAction */
        RecoveryAction: {
            /** Request Id */
            request_id: string;
        };
        /** RecoveryView */
        RecoveryView: {
            /** Checkpoint Id */
            checkpoint_id: number | null;
            /** Code */
            code: string;
            /** Generation */
            generation: number;
            /**
             * Label
             * @default 恢复保留原任务并复用采集；重新发起创建新任务并重新采集。恢复不会调用模型，报告须另行显式生成。
             */
            label: string;
            /** Model Request Uncertain */
            model_request_uncertain: boolean;
            /** Remaining Capabilities */
            remaining_capabilities: string[];
            /** Report Ids */
            report_ids: string[];
            /** Resume Allowed */
            resume_allowed: boolean;
            /** Reuse Capabilities */
            reuse_capabilities: string[];
            /** Run Id */
            run_id: string;
            /**
             * Stage
             * @enum {string}
             */
            stage: "collecting" | "collection_interrupted" | "report_generating" | "awaiting_report" | "completed" | "no_data" | "abandoned" | "blocked";
            /** Warnings */
            warnings: string[];
        };
        /** ReportChange */
        ReportChange: {
            /** After */
            after: string | null;
            /** After Evidence */
            after_evidence?: string | null;
            /** Before */
            before: string | null;
            /** Before Evidence */
            before_evidence?: string | null;
            /** Key */
            key: string;
            /**
             * Kind
             * @enum {string}
             */
            kind: "fact" | "gap" | "analysis";
        };
        /** ReportClaim */
        ReportClaim: {
            /** Evidence Ids */
            evidence_ids: string[];
            /**
             * Kind
             * @enum {string}
             */
            kind: "fact" | "analysis" | "prediction";
            /**
             * Text
             * @default
             */
            text: string;
        };
        /** ReportDiff */
        ReportDiff: {
            /** After Id */
            after_id: string;
            /** Before Id */
            before_id: string;
            /** Changes */
            changes: components["schemas"]["ReportChange"][];
            /**
             * Label
             * @default 比较两份已保存报告；字段或文字变化不代表论断已证明，也不自动推断投资结果。
             */
            label: string;
            /** Source Changed */
            source_changed: boolean;
            /** Symbol */
            symbol: string;
        };
        /** ReportDiffInput */
        ReportDiffInput: {
            /** After Id */
            after_id: string;
            /** Before Id */
            before_id: string;
        };
        /** ReportDocument */
        ReportDocument: {
            /** Collection Status */
            collection_status: string;
            /**
             * Disclaimer
             * @default 事实值来自能力执行记录；分析与预测来自合成器。引用可追溯不等于论断正确。
             */
            disclaimer: string;
            event_context?: components["schemas"]["EventResearchContext"] | null;
            /** Evidence */
            evidence: components["schemas"]["ReportEvidence"][];
            /** Gaps */
            gaps: components["schemas"]["ReportGap"][];
            /** Provider */
            provider: string;
            /**
             * Source Mode
             * @enum {string}
             */
            source_mode: "simulated" | "real";
            /** Source Run Id */
            source_run_id: string;
            /** Strategy */
            strategy: string;
            /** Symbol */
            symbol: string;
            synthesis: components["schemas"]["ReportSynthesis"];
        };
        /** ReportEvidence */
        ReportEvidence: {
            /** Capability */
            capability: string;
            /** Fetched At */
            fetched_at: string;
            /** Id */
            id: string;
            /** Ordinal */
            ordinal: number;
            /** Pointer */
            pointer: string;
            /** Provider */
            provider: string;
            /** Result Hash */
            result_hash: string;
            /** Run Id */
            run_id: string;
            /**
             * Source Mode
             * @enum {string}
             */
            source_mode: "simulated" | "real";
            /** Value */
            value: boolean | number | string;
        };
        /** ReportGap */
        ReportGap: {
            /** Code */
            code: string;
            /** Key */
            key: string;
            /**
             * Scope
             * @enum {string}
             */
            scope: "capability" | "field" | "skill" | "projection";
        };
        /** ReportGenerate */
        ReportGenerate: {
            /**
             * Mode
             * @default fixed
             * @enum {string}
             */
            mode: "fixed" | "real";
            /** Request Id */
            request_id?: string | null;
        };
        /** ReportJob */
        ReportJob: {
            /** Code */
            code: string | null;
            /** Completed At */
            completed_at: string | null;
            document: components["schemas"]["ReportDocument"] | null;
            /** Id */
            id: string;
            /**
             * Mode
             * @enum {string}
             */
            mode: "fixed" | "real";
            /** Request Uncertain */
            request_uncertain: boolean;
            /** Requests Started */
            requests_started: number;
            /** Run Id */
            run_id: string;
            /** Started At */
            started_at: string;
            /**
             * Status
             * @enum {string}
             */
            status: "generating" | "completed" | "failed" | "cancelled" | "interrupted";
            /** Symbol */
            symbol: string;
            /** Version */
            version: number;
        };
        /** ReportMarkdown */
        ReportMarkdown: {
            /** Content */
            content: string;
            /** Filename */
            filename: string;
        };
        /** ReportOriginal */
        ReportOriginal: {
            evidence: components["schemas"]["ReportEvidence"];
            result: components["schemas"]["ProviderSuccess"];
            /** Step Completed At */
            step_completed_at: string;
            /** Step Started At */
            step_started_at: string;
        };
        /** ReportSection */
        ReportSection: {
            /** Claims */
            claims: components["schemas"]["ReportClaim"][];
            /** Key */
            key: string;
            /** Title */
            title: string;
        };
        /** ReportSummary */
        ReportSummary: {
            /** Code */
            code: string | null;
            /** Completed At */
            completed_at: string | null;
            /** Id */
            id: string;
            /**
             * Mode
             * @enum {string}
             */
            mode: "fixed" | "real";
            /** Request Uncertain */
            request_uncertain: boolean;
            /** Requests Started */
            requests_started: number;
            /** Run Id */
            run_id: string;
            /** Started At */
            started_at: string;
            /**
             * Status
             * @enum {string}
             */
            status: "generating" | "completed" | "failed" | "cancelled" | "interrupted";
            /** Symbol */
            symbol: string;
            /** Version */
            version: number;
        };
        /** ReportSynthesis */
        ReportSynthesis: {
            /** Bear Case */
            bear_case: components["schemas"]["ReportClaim"][];
            /** Bull Case */
            bull_case: components["schemas"]["ReportClaim"][];
            /** Catalysts */
            catalysts: components["schemas"]["ReportClaim"][];
            /** Risks */
            risks: components["schemas"]["ReportClaim"][];
            /** Sections */
            sections: components["schemas"]["ReportSection"][];
            /**
             * Stance
             * @enum {string}
             */
            stance: "bullish" | "bearish" | "neutral";
            /** Summary */
            summary: components["schemas"]["ReportClaim"][];
        };
        /** ResearchData */
        ResearchData: {
            /** Capability */
            capability: string;
            result: components["schemas"]["ProviderSuccess"];
            /** Run Id */
            run_id: string;
        };
        /** ResearchInput */
        ResearchInput: {
            /**
             * Concurrency
             * @default 4
             */
            concurrency: number;
            event_ref?: components["schemas"]["EventResearchRef"] | null;
            /**
             * Mode
             * @default simulated
             * @enum {string}
             */
            mode: "simulated" | "real";
            /**
             * Provider
             * @default longbridge
             * @enum {string}
             */
            provider: "longbridge" | "massive";
            /**
             * Strategy
             * @default comprehensive
             * @enum {string}
             */
            strategy: "comprehensive" | "value" | "growth" | "technical" | "earnings" | "event-driven" | "risk-review" | "income";
            /** Symbol */
            symbol: string;
        };
        /** ResearchPlan */
        ResearchPlan: {
            event_context?: components["schemas"]["EventResearchContext"] | null;
            input: components["schemas"]["ResearchInput"];
            /**
             * Label
             * @default 仅结构化数据采集；策略名称不代表指标、投资结论或报告已实现
             */
            label: string;
            /** Provider Identity */
            provider_identity?: string | null;
            /** Provider Revision */
            provider_revision: number;
            /** Reads */
            reads: components["schemas"]["PlannedRead"][];
            /** Skills */
            skills: components["schemas"]["PlannedSkill"][];
            /** Source */
            source: string;
            /** Timeout Seconds */
            timeout_seconds: number;
        };
        /** ResearchRun */
        ResearchRun: {
            /** Abandoned At */
            abandoned_at: string | null;
            /** Completed */
            completed: number;
            /** Completed At */
            completed_at: string | null;
            /** Failed */
            failed: number;
            /** Generation */
            generation: number;
            /** Id */
            id: string;
            /**
             * Mode
             * @enum {string}
             */
            mode: "simulated" | "real";
            /** Parent Run Id */
            parent_run_id: string | null;
            plan: components["schemas"]["ResearchPlan"];
            /**
             * Provider
             * @enum {string}
             */
            provider: "longbridge" | "massive";
            /**
             * Started At
             * Format: date-time
             */
            started_at: string;
            /**
             * Status
             * @enum {string}
             */
            status: "fetching" | "collected" | "partial" | "failed" | "cancelled" | "interrupted";
            /** Steps */
            steps: components["schemas"]["ResearchStep"][];
            /**
             * Strategy
             * @enum {string}
             */
            strategy: "comprehensive" | "value" | "growth" | "technical" | "earnings" | "event-driven" | "risk-review" | "income";
            /** Succeeded */
            succeeded: number;
            /** Symbol */
            symbol: string;
            /** Total */
            total: number;
        };
        /** ResearchStep */
        ResearchStep: {
            /** Capability */
            capability: string;
            /** Code */
            code: string | null;
            /** Completed At */
            completed_at: string | null;
            /** Has Result */
            has_result: boolean;
            /** Ordinal */
            ordinal: number;
            /** Started At */
            started_at: string | null;
            /**
             * Status
             * @enum {string}
             */
            status: "queued" | "running" | "success" | "failed" | "unavailable" | "timed_out" | "cancelled" | "interrupted";
        };
        /** ResearchStrategy */
        ResearchStrategy: {
            /** Capability Ids */
            capability_ids: string[];
            /** Description */
            description: string;
            /**
             * Id
             * @enum {string}
             */
            id: "comprehensive" | "value" | "growth" | "technical" | "earnings" | "event-driven" | "risk-review" | "income";
            /** Name */
            name: string;
            /** Skill Ids */
            skill_ids: string[];
        };
        /** ResearchSummary */
        ResearchSummary: {
            /** Abandoned At */
            abandoned_at: string | null;
            /** Completed */
            completed: number;
            /** Completed At */
            completed_at: string | null;
            /** Failed */
            failed: number;
            /** Generation */
            generation: number;
            /** Id */
            id: string;
            /**
             * Mode
             * @enum {string}
             */
            mode: "simulated" | "real";
            /** Parent Run Id */
            parent_run_id: string | null;
            /**
             * Provider
             * @enum {string}
             */
            provider: "longbridge" | "massive";
            /**
             * Started At
             * Format: date-time
             */
            started_at: string;
            /**
             * Status
             * @enum {string}
             */
            status: "fetching" | "collected" | "partial" | "failed" | "cancelled" | "interrupted";
            /**
             * Strategy
             * @enum {string}
             */
            strategy: "comprehensive" | "value" | "growth" | "technical" | "earnings" | "event-driven" | "risk-review" | "income";
            /** Succeeded */
            succeeded: number;
            /** Symbol */
            symbol: string;
            /** Total */
            total: number;
        };
        /** RiskGroup */
        RiskGroup: {
            /** Allocation */
            allocation: components["schemas"]["Allocation"][];
            /** Currency */
            currency: string;
            /** Herfindahl */
            herfindahl?: string | null;
            portfolio_volatility?: components["schemas"]["SeriesStats"] | null;
            /** Series */
            series: components["schemas"]["SeriesStats"][];
            /** Signals */
            signals: components["schemas"]["RiskSignal"][];
            /**
             * Status
             * @enum {string}
             */
            status: "ready" | "empty" | "partial";
            /** Top1 Weight */
            top1_weight?: string | null;
            /** Top5 Weight */
            top5_weight?: string | null;
            /** Total Market Value */
            total_market_value: string | null;
            /** Unavailable */
            unavailable: string[];
        };
        /** RiskQuery */
        RiskQuery: {
            /**
             * Mode
             * @default simulated
             * @enum {string}
             */
            mode: "simulated" | "real";
            /** Portfolio Id */
            portfolio_id: string;
            /**
             * Provider
             * @default longbridge
             * @enum {string}
             */
            provider: "longbridge" | "massive";
            /**
             * Refresh
             * @default false
             */
            refresh: boolean;
        };
        /** RiskReport */
        RiskReport: {
            /** Account Id */
            account_id: string;
            /** Account Kind */
            account_kind: string;
            /** Calculated At */
            calculated_at: string;
            /** Groups */
            groups: components["schemas"]["RiskGroup"][];
            /** Input Code */
            input_code?: string | null;
            /** Input Message */
            input_message?: string | null;
            /** Input Source */
            input_source: string;
            /** Input Status */
            input_status: string;
            /** Input Time */
            input_time: string | null;
            /** Limitations */
            limitations: string[];
            /**
             * Mode
             * @enum {string}
             */
            mode: "simulated" | "real";
            /** Portfolio Id */
            portfolio_id: string;
            /** Portfolio Revision */
            portfolio_revision: number;
            /**
             * Provider
             * @enum {string}
             */
            provider: "longbridge" | "massive";
            /** Reads */
            reads: components["schemas"]["AnalysisRead"][];
            /** Snapshot Id */
            snapshot_id: string;
            /**
             * Status
             * @enum {string}
             */
            status: "ready" | "empty" | "partial" | "failed";
            /** Summary */
            summary: string;
        };
        /** RiskSignal */
        RiskSignal: {
            /** Detail */
            detail: string;
            /** Kind */
            kind: string;
            /**
             * Severity
             * @enum {string}
             */
            severity: "low" | "medium" | "high";
            /** Symbol */
            symbol?: string | null;
        };
        /** RiskToolData */
        RiskToolData: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            kind: "risk";
            report: components["schemas"]["RiskReport"];
        };
        /** RuleInput */
        RuleInput: {
            /**
             * Auto Research
             * @default false
             */
            auto_research: boolean;
            /**
             * Cooldown Minutes
             * @default 60
             */
            cooldown_minutes: number;
            /** Days */
            days?: number[];
            /**
             * Enabled
             * @default false
             */
            enabled: boolean;
            /**
             * Horizon Days
             * @default 7
             */
            horizon_days: number;
            /**
             * Hour
             * @default 16
             */
            hour: number;
            /**
             * Kind
             * @enum {string}
             */
            kind: "price_above" | "price_below" | "new_news" | "earnings" | "rating_change" | "dividend" | "position_weight" | "portfolio_drawdown" | "watchlist-daily-review" | "portfolio-daily-brief" | "weekly-thesis-review" | "pre-earnings-research" | "post-earnings-research";
            /**
             * Minute
             * @default 30
             */
            minute: number;
            /**
             * Mode
             * @default simulated
             * @enum {string}
             */
            mode: "simulated" | "real";
            /** Name */
            name: string;
            /**
             * Notify
             * @default material-only
             * @enum {string}
             */
            notify: "material-only" | "all";
            /** Portfolio Id */
            portfolio_id?: string | null;
            /**
             * Provider
             * @default longbridge
             * @enum {string}
             */
            provider: "longbridge" | "massive";
            /**
             * Request Id
             * Format: uuid
             */
            request_id: string;
            /** Symbol */
            symbol?: string | null;
            /** Threshold */
            threshold?: string | null;
            /**
             * Timezone
             * @default Asia/Shanghai
             */
            timezone: string;
        };
        /** RuleToggle */
        RuleToggle: {
            /** Enabled */
            enabled: boolean;
        };
        /** RuleView */
        RuleView: {
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Id */
            id: string;
            input: components["schemas"]["RuleInput"];
            /** Last Checked At */
            last_checked_at?: string | null;
            /** Last Code */
            last_code?: string | null;
            /** Last Triggered At */
            last_triggered_at?: string | null;
            /** Next Due */
            next_due?: string | null;
            /** Revision */
            revision: number;
        };
        /** RunCompletedEvent */
        RunCompletedEvent: {
            payload: components["schemas"]["CompletedPayload"];
            /**
             * Protocol Version
             * @default 1
             * @constant
             */
            protocol_version: 1;
            /** Run Id */
            run_id: string;
            /** Sequence */
            sequence: number;
            /** Session Id */
            session_id: string;
            /**
             * Timestamp
             * Format: date-time
             */
            timestamp: string;
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "run_completed";
        };
        /** RunDTO */
        RunDTO: {
            /** Answer */
            answer: string;
            /** Assistant Message Id */
            assistant_message_id: string;
            /** Completed At */
            completed_at: string | null;
            error?: components["schemas"]["ErrorPayload"] | null;
            /** Id */
            id: string;
            /** Input */
            input: string;
            /**
             * Kind
             * @enum {string}
             */
            kind: "fixture" | "fake_agent" | "openai_agent";
            /** Last Sequence */
            last_sequence: number;
            /** Model Label */
            model_label?: ("规则演示／假模型" | "OpenAI兼容／真实模型") | null;
            /** Session Id */
            session_id: string;
            /**
             * Started At
             * Format: date-time
             */
            started_at: string;
            /**
             * Status
             * @enum {string}
             */
            status: "running" | "completed" | "failed" | "cancelled" | "timed_out" | "interrupted";
        };
        /** RunStartedEvent */
        RunStartedEvent: {
            payload: components["schemas"]["StartedPayload"];
            /**
             * Protocol Version
             * @default 1
             * @constant
             */
            protocol_version: 1;
            /** Run Id */
            run_id: string;
            /** Sequence */
            sequence: number;
            /** Session Id */
            session_id: string;
            /**
             * Timestamp
             * Format: date-time
             */
            timestamp: string;
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "run_started";
        };
        /** ScreeningContext */
        ScreeningContext: {
            /**
             * Mode
             * @default simulated
             * @enum {string}
             */
            mode: "simulated" | "real";
            /**
             * Provider
             * @default longbridge
             * @enum {string}
             */
            provider: "longbridge" | "massive";
        };
        /** ScreeningDecision */
        ScreeningDecision: {
            /** Code */
            code?: string | null;
            /** Metrics */
            metrics?: components["schemas"]["ScreeningMetric"][];
            /** Name */
            name: string;
            /** Reasons */
            reasons?: string[];
            /** Score */
            score?: string | null;
            /**
             * Status
             * @enum {string}
             */
            status: "included" | "excluded" | "missing" | "failed";
            /** Symbol */
            symbol: string;
        };
        /** ScreeningEvidence */
        ScreeningEvidence: {
            read: components["schemas"]["ScreeningRead"];
            /** Result */
            result: components["schemas"]["ProviderSuccess"] | components["schemas"]["ProviderFailure"];
            /** Run Id */
            run_id: string;
        };
        /** ScreeningInput */
        ScreeningInput: {
            /**
             * Limit
             * @default 20
             */
            limit: number;
            /**
             * Mode
             * @default simulated
             * @enum {string}
             */
            mode: "simulated" | "real";
            /**
             * Provider
             * @default longbridge
             * @enum {string}
             */
            provider: "longbridge" | "massive";
            /**
             * Request Id
             * Format: uuid
             */
            request_id: string;
            /**
             * Strategy
             * @default top-gainers
             * @enum {string}
             */
            strategy: "top-gainers" | "top-losers" | "high-volume" | "unusual-movement" | "low-valuation" | "high-roe" | "revenue-growth" | "high-dividend" | "quality-growth" | "strong-momentum" | "breakout" | "oversold" | "trend-reversal" | "upcoming-earnings" | "rating-changes" | "news-surge" | "dividend-events";
            /** Universe */
            universe?: string[] | null;
        };
        /** ScreeningMetric */
        ScreeningMetric: {
            /** Formula */
            formula: string;
            /** Inputs */
            inputs: components["schemas"]["ScreeningReference"][];
            /** Name */
            name: string;
            /** Unit */
            unit: string;
            /** Value */
            value: string;
        };
        /** ScreeningRead */
        ScreeningRead: {
            /** Code */
            code?: string | null;
            /** Ended At */
            ended_at?: string | null;
            /** Id */
            id: string;
            query: components["schemas"]["ReadQuery"];
            /** Result Hash */
            result_hash?: string | null;
            /** Started At */
            started_at?: string | null;
            /**
             * Status
             * @default pending
             * @enum {string}
             */
            status: "pending" | "running" | "completed" | "failed";
            /** Symbol */
            symbol: string;
        };
        /** ScreeningReference */
        ScreeningReference: {
            /** Pointer */
            pointer: string;
            /** Read Id */
            read_id: string;
        };
        /** ScreeningRun */
        ScreeningRun: {
            /**
             * Candidate Count
             * @default 0
             */
            candidate_count: number;
            /** Candidates */
            candidates?: components["schemas"]["ScreeningDecision"][];
            /**
             * Concurrency
             * @default 4
             */
            concurrency: number;
            /** Created At */
            created_at: string;
            /** Decisions */
            decisions?: components["schemas"]["ScreeningDecision"][];
            /** Id */
            id: string;
            input: components["schemas"]["ScreeningInput"];
            /**
             * Label
             * @default 仅筛选这个有界股票池；分数是固定规则分数，不是收益概率。模拟、历史和缺失数据见原始执行记录。未调用LLM。
             */
            label: string;
            /** Reads */
            reads: components["schemas"]["ScreeningRead"][];
            /** Reference Time */
            reference_time: string;
            /**
             * Status
             * @enum {string}
             */
            status: "fetching" | "completed" | "partial" | "failed" | "cancelled" | "interrupted";
            /**
             * Strategy
             * @enum {string}
             */
            strategy: "top-gainers" | "top-losers" | "high-volume" | "unusual-movement" | "low-valuation" | "high-roe" | "revenue-growth" | "high-dividend" | "quality-growth" | "strong-momentum" | "breakout" | "oversold" | "trend-reversal" | "upcoming-earnings" | "rating-changes" | "news-surge" | "dividend-events";
            task: components["schemas"]["ScreeningTask"];
            /**
             * Timeout Seconds
             * @default 15
             */
            timeout_seconds: number;
            /** Universe */
            universe: string[];
            /**
             * Universe Source
             * @enum {string}
             */
            universe_source: "explicit" | "watchlist" | "fixture-catalog";
        };
        /** ScreeningSummary */
        ScreeningSummary: {
            /**
             * Candidate Count
             * @default 0
             */
            candidate_count: number;
            /** Created At */
            created_at: string;
            /** Id */
            id: string;
            /**
             * Status
             * @enum {string}
             */
            status: "fetching" | "completed" | "partial" | "failed" | "cancelled" | "interrupted";
            /**
             * Strategy
             * @enum {string}
             */
            strategy: "top-gainers" | "top-losers" | "high-volume" | "unusual-movement" | "low-valuation" | "high-roe" | "revenue-growth" | "high-dividend" | "quality-growth" | "strong-momentum" | "breakout" | "oversold" | "trend-reversal" | "upcoming-earnings" | "rating-changes" | "news-surge" | "dividend-events";
        };
        /** ScreeningTask */
        ScreeningTask: {
            /** Capabilities */
            capabilities: components["schemas"]["CapabilityState"][];
            /**
             * Id
             * @enum {string}
             */
            id: "top-gainers" | "top-losers" | "high-volume" | "unusual-movement" | "low-valuation" | "high-roe" | "revenue-growth" | "high-dividend" | "quality-growth" | "strong-momentum" | "breakout" | "oversold" | "trend-reversal" | "upcoming-earnings" | "rating-changes" | "news-surge" | "dividend-events";
            /** Rule */
            rule: string;
            /** Score Rule */
            score_rule: string;
            /** Title */
            title: string;
        };
        /** SecurityBlock */
        SecurityBlock: {
            /** Bars */
            bars?: components["schemas"]["Kline"][];
            /** Capability */
            capability: string;
            /** Code */
            code?: string | null;
            /** Financials */
            financials?: components["schemas"]["FinancialRow"][];
            /** Markets */
            markets?: components["schemas"]["TradingStatus"][];
            /** Message */
            message?: string | null;
            /** Metrics */
            metrics?: components["schemas"]["Metric"][];
            /** News */
            news?: components["schemas"]["News"][];
            provenance?: components["schemas"]["Provenance"] | null;
            /**
             * Status
             * @enum {string}
             */
            status: "ready" | "missing" | "failed" | "restricted" | "unsupported" | "unconfigured" | "disabled" | "timed_out" | "cancelled";
            /** Symbol */
            symbol?: string | null;
            /** Title */
            title: string;
        };
        /** SecurityPage */
        SecurityPage: {
            /** Blocks */
            blocks: components["schemas"]["SecurityBlock"][];
            /**
             * Mode
             * @enum {string}
             */
            mode: "simulated" | "real";
            /**
             * Provider
             * @enum {string}
             */
            provider: "longbridge" | "massive";
            /**
             * Requested At
             * Format: date-time
             */
            requested_at: string;
            /**
             * Status
             * @enum {string}
             */
            status: "ready" | "missing" | "partial" | "failed";
            /** Symbol */
            symbol: string | null;
            /**
             * View
             * @enum {string}
             */
            view: "watchlist" | "overview" | "quote" | "kline" | "financials" | "news" | "status";
        };
        /** SecurityQuery */
        SecurityQuery: {
            /**
             * Kind
             * @default ALL
             * @enum {string}
             */
            kind: "ALL" | "IS" | "BS" | "CF";
            /**
             * Mode
             * @default simulated
             * @enum {string}
             */
            mode: "simulated" | "real";
            /**
             * Offset
             * @default 0
             */
            offset: number;
            /**
             * Period
             * @default 1d
             * @enum {string}
             */
            period: "1m" | "5m" | "15m" | "1h" | "1d" | "1w";
            /**
             * Provider
             * @default longbridge
             * @enum {string}
             */
            provider: "longbridge" | "massive";
            /**
             * Report
             * @default annual
             * @enum {string}
             */
            report: "annual" | "interim" | "quarter";
            /** Symbol */
            symbol?: string | null;
            /**
             * View
             * @enum {string}
             */
            view: "watchlist" | "overview" | "quote" | "kline" | "financials" | "news" | "status";
        };
        /** SeriesStats */
        SeriesStats: {
            /** Annualized Volatility */
            annualized_volatility?: string | null;
            /**
             * Bars
             * @default 0
             */
            bars: number;
            /** Daily Volatility */
            daily_volatility?: string | null;
            /** Drawdown */
            drawdown?: string | null;
            /** End */
            end?: string | null;
            /** Reason */
            reason?: string | null;
            /**
             * Returns
             * @default 0
             */
            returns: number;
            /** Start */
            start?: string | null;
            /**
             * Status
             * @enum {string}
             */
            status: "ready" | "missing" | "invalid";
            /** Symbol */
            symbol: string;
        };
        /** SessionDTO */
        SessionDTO: {
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Id */
            id: string;
            /** Message Count */
            message_count: number;
            /** Title */
            title: string;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
        };
        /** SessionSnapshot */
        SessionSnapshot: {
            /** Events */
            events: (components["schemas"]["RunStartedEvent"] | components["schemas"]["MessageStartedEvent"] | components["schemas"]["StatusEvent"] | components["schemas"]["TextDeltaEvent"] | components["schemas"]["MessageCompletedEvent"] | components["schemas"]["RunCompletedEvent"] | components["schemas"]["ToolStartedEvent"] | components["schemas"]["ToolResultEvent"] | components["schemas"]["ErrorEvent"] | components["schemas"]["CancelledEvent"])[];
            /** Messages */
            messages: components["schemas"]["MessageDTO"][];
            /** Runs */
            runs: components["schemas"]["RunDTO"][];
            session: components["schemas"]["SessionDTO"];
        };
        /** SkillRead */
        SkillRead: {
            /**
             * Mode
             * @default simulated
             * @enum {string}
             */
            mode: "simulated" | "real";
            /** Path */
            path: string;
            /**
             * Provider
             * @default longbridge
             * @enum {string}
             */
            provider: "longbridge" | "longbridge-account" | "massive";
        };
        /** SkillResource */
        SkillResource: {
            /** Content */
            content: string;
            /**
             * Label
             * @default 参考文本；不是可执行指令或能力验收证明
             */
            label: string;
            /**
             * Mode
             * @enum {string}
             */
            mode: "simulated" | "real";
            /** Path */
            path: string;
            /** Skill Id */
            skill_id: string;
        };
        /** SkillToggle */
        SkillToggle: {
            /** Enabled */
            enabled: boolean;
            /**
             * Mode
             * @default simulated
             * @enum {string}
             */
            mode: "simulated" | "real";
            /**
             * Provider
             * @default longbridge
             * @enum {string}
             */
            provider: "longbridge" | "longbridge-account" | "massive";
        };
        /** SkillView */
        SkillView: {
            /** Code */
            code: string;
            /** Description */
            description: string;
            /** Enabled */
            enabled: boolean;
            /** Id */
            id: string;
            /** Missing Resources */
            missing_resources: string[];
            /**
             * Mode
             * @enum {string}
             */
            mode: "simulated" | "real";
            /** Name */
            name: string;
            /** Optional */
            optional: components["schemas"]["CapabilityState"][];
            /** Provider */
            provider: string;
            /** Required */
            required: components["schemas"]["CapabilityState"][];
            /** Resources */
            resources: string[];
            /** Source */
            source: string;
            /**
             * Status
             * @enum {string}
             */
            status: "ready" | "partial" | "unavailable" | "disabled" | "invalid";
        };
        /** StartRun */
        StartRun: {
            /** Input */
            input: string;
            /**
             * Kind
             * @default fixture
             * @enum {string}
             */
            kind: "fixture" | "fake_agent" | "openai_agent";
            /**
             * Scenario
             * @default normal
             * @enum {string}
             */
            scenario: "normal" | "delayed" | "timeout";
        };
        /** StartedPayload */
        StartedPayload: {
            /** Input */
            input: string;
            /**
             * Started At
             * Format: date-time
             */
            started_at: string;
        };
        /** StatusEvent */
        StatusEvent: {
            payload: components["schemas"]["StatusPayload"];
            /**
             * Protocol Version
             * @default 1
             * @constant
             */
            protocol_version: 1;
            /** Run Id */
            run_id: string;
            /** Sequence */
            sequence: number;
            /** Session Id */
            session_id: string;
            /**
             * Timestamp
             * Format: date-time
             */
            timestamp: string;
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "status";
        };
        /** StatusPayload */
        StatusPayload: {
            /** Detail */
            detail: string;
            /**
             * Phase
             * @constant
             */
            phase: "working";
        };
        /** SymbolInput */
        SymbolInput: {
            /** Symbol */
            symbol: string;
        };
        /** TextDeltaEvent */
        TextDeltaEvent: {
            /** Message Id */
            message_id: string;
            payload: components["schemas"]["TextPayload"];
            /**
             * Protocol Version
             * @default 1
             * @constant
             */
            protocol_version: 1;
            /** Run Id */
            run_id: string;
            /** Sequence */
            sequence: number;
            /** Session Id */
            session_id: string;
            /**
             * Timestamp
             * Format: date-time
             */
            timestamp: string;
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "text_delta";
        };
        /** TextPayload */
        TextPayload: {
            /** Text */
            text: string;
        };
        /** ThesisContent */
        ThesisContent: {
            /** Bear Case */
            bear_case: string[];
            /** Bull Case */
            bull_case: string[];
            /** Catalysts */
            catalysts: string[];
            /** Risks */
            risks: string[];
            /**
             * Stance
             * @enum {string}
             */
            stance: "bullish" | "bearish" | "neutral";
            /** Summary */
            summary: string;
        };
        /** ThesisCreate */
        ThesisCreate: {
            /** Report Id */
            report_id: string;
            /** Request Id */
            request_id: string;
        };
        /** ThesisEdit */
        ThesisEdit: {
            content: components["schemas"]["ThesisContent"];
            /** Expected Version */
            expected_version: number;
            /** Reason */
            reason: string;
            /** Request Id */
            request_id: string;
        };
        /** ThesisEvaluate */
        ThesisEvaluate: {
            /** Expected Version */
            expected_version: number;
            /** Report Id */
            report_id?: string | null;
            /** Request Id */
            request_id: string;
        };
        /** ThesisJudge */
        ThesisJudge: {
            content: components["schemas"]["ThesisContent"];
            /** Evaluation Id */
            evaluation_id: string;
            /** Expected Version */
            expected_version: number;
            /**
             * Judgment
             * @enum {string}
             */
            judgment: "strengthened" | "weakened" | "invalidated" | "unchanged" | "needs_revision";
            /** Reason */
            reason: string;
            /** Request Id */
            request_id: string;
        };
        /** ThesisReview */
        ThesisReview: {
            base_content: components["schemas"]["ThesisContent"];
            /** Base Version */
            base_version: number;
            baseline_report: components["schemas"]["ReportJob"];
            candidate_report: components["schemas"]["ReportJob"] | null;
            /** Code */
            code: string | null;
            /** Comparison */
            comparison: ("changed" | "unchanged") | null;
            /** Created At */
            created_at: string;
            difference: components["schemas"]["ReportDiff"] | null;
            /** Evaluation Id */
            evaluation_id: string | null;
            /** Id */
            id: string;
            /** Judgment */
            judgment: ("strengthened" | "weakened" | "invalidated" | "unchanged" | "needs_revision") | null;
            /**
             * Kind
             * @enum {string}
             */
            kind: "evaluation" | "judgment";
            /**
             * Label
             * @default 自动评估只比较已保存的新旧事实；投资影响由用户显式判断。缺数据时不产生变化结论。
             */
            label: string;
            /** Missing Keys */
            missing_keys: string[];
            /** New Version */
            new_version: number | null;
            /** Reason */
            reason: string;
            /** Report Id */
            report_id: string | null;
            /** Requested Report Id */
            requested_report_id: string | null;
            /**
             * Status
             * @enum {string}
             */
            status: "ready" | "unable" | "reviewed";
            /** Thesis Id */
            thesis_id: string;
        };
        /** ThesisReviewSummary */
        ThesisReviewSummary: {
            /** Base Version */
            base_version: number;
            /** Code */
            code: string | null;
            /** Comparison */
            comparison: ("changed" | "unchanged") | null;
            /** Created At */
            created_at: string;
            /** Id */
            id: string;
            /** Judgment */
            judgment: ("strengthened" | "weakened" | "invalidated" | "unchanged" | "needs_revision") | null;
            /**
             * Kind
             * @enum {string}
             */
            kind: "evaluation" | "judgment";
            /** New Version */
            new_version: number | null;
            /** Reason */
            reason: string;
            /** Report Id */
            report_id: string | null;
            /**
             * Status
             * @enum {string}
             */
            status: "ready" | "unable" | "reviewed";
            /** Thesis Id */
            thesis_id: string;
        };
        /** ThesisSummary */
        ThesisSummary: {
            /** Created At */
            created_at: string;
            /** Current Version */
            current_version: number;
            /** Id */
            id: string;
            /** Origin Report Id */
            origin_report_id: string;
            /** Symbol */
            symbol: string;
        };
        /** ThesisVersion */
        ThesisVersion: {
            content: components["schemas"]["ThesisContent"];
            /** Created At */
            created_at: string;
            data_report: components["schemas"]["ReportJob"];
            /**
             * Label
             * @default 文字是合成器或用户的分析与判断；对应事实保存在来源报告和实际执行记录中，引用不证明判断正确。
             */
            label: string;
            /**
             * Origin
             * @enum {string}
             */
            origin: "report" | "edit" | "review";
            /** Reason */
            reason: string;
            /** Report Id */
            report_id: string;
            /** Thesis Id */
            thesis_id: string;
            /** Version */
            version: number;
        };
        /** ThesisVersionSummary */
        ThesisVersionSummary: {
            /** Created At */
            created_at: string;
            /**
             * Origin
             * @enum {string}
             */
            origin: "report" | "edit" | "review";
            /** Reason */
            reason: string;
            /** Report Id */
            report_id: string;
            /** Version */
            version: number;
        };
        /** ThesisView */
        ThesisView: {
            /** Created At */
            created_at: string;
            current: components["schemas"]["ThesisVersion"];
            /** Current Version */
            current_version: number;
            /**
             * History Limit
             * @default 100
             */
            history_limit: number;
            /** Id */
            id: string;
            /** Origin Report Id */
            origin_report_id: string;
            /** Reviews */
            reviews: components["schemas"]["ThesisReviewSummary"][];
            /** Symbol */
            symbol: string;
            /** Versions */
            versions: components["schemas"]["ThesisVersionSummary"][];
        };
        /** TodayInput */
        TodayInput: {
            /**
             * Timezone
             * @default Asia/Shanghai
             */
            timezone: string;
        };
        /** TodayItem */
        TodayItem: {
            /** Mode */
            mode?: string | null;
            /** Provider */
            provider?: string | null;
            /** Reason */
            reason: string;
            /**
             * Source
             * @enum {string}
             */
            source: "alert" | "automation" | "calendar" | "research" | "report" | "thesis" | "portfolio" | "watchlist";
            /** Source Id */
            source_id: string;
            /** Status */
            status: string;
            /** Symbol */
            symbol?: string | null;
            /** Title */
            title: string;
        };
        /** TodayView */
        TodayView: {
            /**
             * Application Only
             * @default true
             */
            application_only: boolean;
            brief: components["schemas"]["DailyBrief"];
            /**
             * External Tracing
             * @default false
             */
            external_tracing: boolean;
            /**
             * Generated At
             * Format: date-time
             */
            generated_at: string;
            /** Items */
            items: components["schemas"]["TodayItem"][];
            /** Limitations */
            limitations: string[];
            /** Research Actions */
            research_actions: components["schemas"]["MonitorResearchAction"][];
            /** Rules */
            rules: components["schemas"]["RuleView"][];
            /** Runs */
            runs: components["schemas"]["MonitorRun"][];
            /** Timezone */
            timezone: string;
        };
        /** ToolArguments */
        ToolArguments: {
            /** Symbol */
            symbol: string;
        };
        /** ToolFailure */
        ToolFailure: {
            error: components["schemas"]["ErrorPayload"];
            /**
             * Ok
             * @default false
             * @constant
             */
            ok: false;
        };
        /** ToolResultEvent */
        ToolResultEvent: {
            payload: components["schemas"]["ToolResultPayload"];
            /**
             * Protocol Version
             * @default 1
             * @constant
             */
            protocol_version: 1;
            /** Run Id */
            run_id: string;
            /** Sequence */
            sequence: number;
            /** Session Id */
            session_id: string;
            /**
             * Timestamp
             * Format: date-time
             */
            timestamp: string;
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "tool_result";
        };
        /** ToolResultPayload */
        ToolResultPayload: {
            /** Call Id */
            call_id: string;
            /**
             * Name
             * @enum {string}
             */
            name: "market.quote" | "market.kline" | "portfolio.risk" | "stocks.compare";
            /** Result */
            result: components["schemas"]["ToolSuccess"] | components["schemas"]["ToolFailure"];
        };
        /** ToolStartedEvent */
        ToolStartedEvent: {
            payload: components["schemas"]["ToolStartedPayload"];
            /**
             * Protocol Version
             * @default 1
             * @constant
             */
            protocol_version: 1;
            /** Run Id */
            run_id: string;
            /** Sequence */
            sequence: number;
            /** Session Id */
            session_id: string;
            /**
             * Timestamp
             * Format: date-time
             */
            timestamp: string;
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "tool_started";
        };
        /** ToolStartedPayload */
        ToolStartedPayload: {
            /** Call Id */
            call_id: string;
            /** Input */
            input: components["schemas"]["ToolArguments"] | components["schemas"]["RiskQuery"] | components["schemas"]["CompareQuery"];
            /**
             * Name
             * @enum {string}
             */
            name: "market.quote" | "market.kline" | "portfolio.risk" | "stocks.compare";
        };
        /** ToolSuccess */
        ToolSuccess: {
            /** Data */
            data: components["schemas"]["QuoteToolData"] | components["schemas"]["KlineToolData"] | components["schemas"]["RiskToolData"] | components["schemas"]["CompareToolData"];
            /**
             * Ok
             * @default true
             * @constant
             */
            ok: true;
        };
        /** TraceConfig */
        TraceConfig: {
            /**
             * Enabled
             * @default false
             */
            enabled: boolean;
            /**
             * Endpoint
             * @default
             */
            endpoint: string;
            /**
             * Project
             * @default research-trail
             */
            project: string;
        };
        /** TraceConfigView */
        TraceConfigView: {
            /** Checked At */
            checked_at?: string | null;
            /**
             * Code
             * @default TRACING_DISABLED
             */
            code: string;
            /** Credential Present */
            credential_present: boolean;
            /**
             * Enabled
             * @default false
             */
            enabled: boolean;
            /**
             * Endpoint
             * @default
             */
            endpoint: string;
            /**
             * Privacy
             * @default minimal-allowlist-v1
             * @constant
             */
            privacy: "minimal-allowlist-v1";
            /**
             * Project
             * @default research-trail
             */
            project: string;
            /**
             * Provider
             * @enum {string}
             */
            provider: "langsmith" | "langfuse";
            /**
             * Revision
             * @default 0
             */
            revision: number;
            /**
             * Status
             * @default disabled
             */
            status: string;
        };
        /** TraceCredential */
        TraceCredential: {
            /** Public Key */
            public_key?: string | null;
            /**
             * Secret
             * Format: password
             */
            secret: string;
            /** Workspace Id */
            workspace_id?: string | null;
        };
        /** TraceDelivery */
        TraceDelivery: {
            /** Code */
            code: string;
            /** Created At */
            created_at: string;
            /** Experiment Id */
            experiment_id: string;
            /** Id */
            id: string;
            /**
             * Provider
             * @enum {string}
             */
            provider: "langsmith" | "langfuse";
            /**
             * Status
             * @enum {string}
             */
            status: "claimed" | "uploaded" | "failed" | "uncertain";
        };
        /** TracePreview */
        TracePreview: {
            /** Digest */
            digest: string;
            /**
             * Excluded
             * @default [
             *       "prompt",
             *       "answer",
             *       "tool-input",
             *       "tool-output",
             *       "feedback",
             *       "names",
             *       "account",
             *       "portfolio",
             *       "credentials"
             *     ]
             */
            excluded: string[];
            /** Experiment Id */
            experiment_id: string;
            /** Payload */
            payload: {
                [key: string]: unknown;
            };
            /**
             * Provider
             * @enum {string}
             */
            provider: "langsmith" | "langfuse";
            /** Revision */
            revision: number;
        };
        /** TraceProbe */
        TraceProbe: {
            /**
             * Confirm Connection
             * @constant
             */
            confirm_connection: true;
        };
        /** TraceUpload */
        TraceUpload: {
            /**
             * Confirm Upload
             * @constant
             */
            confirm_upload: true;
            /** Digest */
            digest: string;
            /**
             * Request Id
             * Format: uuid
             */
            request_id: string;
        };
        /** TradingStatus */
        TradingStatus: {
            /** Market */
            market: string;
            /** Market Time */
            market_time?: string | null;
            /** Status */
            status?: string | null;
        };
        /** ValidationError */
        ValidationError: {
            /** Context */
            ctx?: Record<string, never>;
            /** Input */
            input?: unknown;
            /** Location */
            loc: (string | number)[];
            /** Message */
            msg: string;
            /** Error Type */
            type: string;
        };
        /** WatchEntry */
        WatchEntry: {
            /** Name */
            name: string;
            /** Symbol */
            symbol: string;
        };
        /** WeightChange */
        WeightChange: {
            /** Expected Version */
            expected_version: number;
            parameters?: components["schemas"]["WeightParameters-Input"] | null;
            /** Reason */
            reason: string;
            /** Request Id */
            request_id: string;
            /** Rollback Version */
            rollback_version?: number | null;
        };
        /** WeightHistory */
        WeightHistory: {
            /** Current Version */
            current_version: number;
            /** Versions */
            versions: components["schemas"]["WeightVersion"][];
        };
        /** WeightParameters */
        "WeightParameters-Input": {
            /**
             * Full Confidence Samples
             * @default 100
             */
            full_confidence_samples: number;
            /**
             * Min Samples
             * @default 30
             */
            min_samples: number;
            /**
             * Sensitivity
             * @default 0.5
             */
            sensitivity: number | string;
            /**
             * Unable Penalty
             * @default 0.05
             */
            unable_penalty: number | string;
        };
        /** WeightParameters */
        "WeightParameters-Output": {
            /**
             * Full Confidence Samples
             * @default 100
             */
            full_confidence_samples: number;
            /**
             * Min Samples
             * @default 30
             */
            min_samples: number;
            /**
             * Sensitivity
             * @default 0.5
             */
            sensitivity: string;
            /**
             * Unable Penalty
             * @default 0.05
             */
            unable_penalty: string;
        };
        /** WeightVersion */
        WeightVersion: {
            /**
             * Calculation Version
             * @default research-trail-calibration-v1
             */
            calculation_version: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            parameters: components["schemas"]["WeightParameters-Output"];
            /** Parent Version */
            parent_version: number | null;
            /** Reason */
            reason: string;
            /** Rollback Version */
            rollback_version: number | null;
            /** Version */
            version: number;
        };
        /** WorkspaceState */
        WorkspaceState: {
            /** Active Symbol */
            active_symbol: string | null;
            /** Entries */
            entries: components["schemas"]["WatchEntry"][];
            /** Revision */
            revision: number;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    compare_stocks_analytics_compare_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CompareQuery"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Comparison"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    portfolio_risk_analytics_risk_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RiskQuery"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RiskReport"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    calendar_list_calendar_snapshots_get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CalendarSummary"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    calendar_refresh_calendar_snapshots_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CalendarRefresh"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CalendarPage"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    calendar_original_calendar_snapshots__identity__reads__read_id__get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
                read_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CalendarOriginal"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    calendar_view_calendar_snapshots__identity__view_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CalendarViewInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CalendarPage"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    calendar_sources_calendar_sources_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CalendarSelection"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CalendarSource"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    capabilities_capabilities_get: {
        parameters: {
            query?: {
                mode?: "simulated" | "real";
                provider?: "longbridge" | "longbridge-account" | "massive";
            };
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CapabilityState"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    evaluation_baselines_evaluation_baselines_get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BaselineSummary"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    evaluation_baseline_evaluation_baselines_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["BaselineInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BaselineView"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    evaluation_cases_evaluation_cases_get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EvaluationCase"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    evaluation_experiments_evaluation_experiments_get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ExperimentSummary"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    evaluation_create_evaluation_experiments_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ExperimentInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ExperimentView"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    evaluation_experiment_evaluation_experiments__identity__get: {
        parameters: {
            query?: {
                baseline_id?: string | null;
            };
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ExperimentView"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    evaluation_cancel_evaluation_experiments__identity__cancel_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ExperimentView"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    evaluation_feedback_list_evaluation_experiments__identity__feedback_get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FeedbackView"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    evaluation_feedback_evaluation_experiments__identity__feedback_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["FeedbackInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FeedbackView"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    evaluation_start_evaluation_experiments__identity__start_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ExperimentView"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    evaluation_trace_preview_evaluation_experiments__identity__tracing__provider__preview_get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
                provider: "langsmith" | "langfuse";
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TracePreview"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    evaluation_trace_upload_evaluation_experiments__identity__tracing__provider__upload_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
                provider: "langsmith" | "langfuse";
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TraceUpload"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TraceDelivery"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    evaluation_tracing_evaluation_tracing_get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TraceConfigView"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    evaluation_trace_deliveries_evaluation_tracing_deliveries_get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TraceDelivery"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    evaluation_trace_config_evaluation_tracing__provider__put: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                provider: "langsmith" | "langfuse";
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TraceConfig"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TraceConfigView"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    evaluation_trace_credential_evaluation_tracing__provider__credential_put: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                provider: "langsmith" | "langfuse";
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TraceCredential"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TraceConfigView"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    evaluation_trace_delete_evaluation_tracing__provider__credential_delete: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                provider: "langsmith" | "langfuse";
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TraceConfigView"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    evaluation_trace_probe_evaluation_tracing__provider__probe_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                provider: "langsmith" | "langfuse";
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TraceProbe"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TraceConfigView"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    health_health_get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Health"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    snapshot_market_snapshot__symbol__get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                symbol: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MarketSnapshot"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MarketError"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    symbols_market_symbols_get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MarketSymbol"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    monitoring_notifications_monitoring_notifications_get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MonitorRun"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    monitoring_claim_monitoring_notifications__identity__claim_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MonitorRun"] | null;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    monitoring_delivery_monitoring_notifications__identity__result_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["NotificationResult"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MonitorRun"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    monitoring_rules_monitoring_rules_get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RuleView"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    monitoring_create_monitoring_rules_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RuleInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RuleView"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    monitoring_toggle_monitoring_rules__identity__enabled_put: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RuleToggle"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RuleView"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    monitoring_runs_monitoring_runs_get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MonitorRun"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    monitoring_research_monitoring_runs__identity__research_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MonitorResearchInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MonitorResearchAction"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    outcome_opinions_outcomes_opinions_get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OutcomeOpinion"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    outcome_capture_outcomes_opinions_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["OutcomeCapture"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OutcomeOpinion"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    outcome_view_outcomes_opinions__identity__get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OutcomeView"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    outcome_evaluate_outcomes_opinions__identity__evaluate_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["OutcomeRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OutcomeAttempt"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    outcome_performance_outcomes_performance_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PerformanceQuery"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PerformanceSnapshot"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    outcome_snapshot_outcomes_performance__identity__get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PerformanceSnapshot"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    outcome_policies_outcomes_policies_get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WeightHistory"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    outcome_policy_change_outcomes_policies_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WeightChange"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WeightVersion"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    portfolio_list_portfolios_get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PortfolioInfo"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    portfolio_create_portfolios_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PortfolioCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PortfolioView"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    portfolio_confirm_portfolios_confirm_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ImportConfirm"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PortfolioView"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    portfolio_preview_portfolios_preview_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CsvPreviewInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ImportPreview"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    portfolio_refresh_portfolios_refresh_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PortfolioId"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PortfolioView"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    portfolio_undo_portfolios_undo_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ImportUndo"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PortfolioView"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    portfolio_view_portfolios_view_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PortfolioId"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PortfolioView"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    provider_capabilities_providers_capabilities_get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CapabilityView"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    provider_query_providers__provider__query_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                provider: "longbridge" | "longbridge-account" | "massive";
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReadQuery"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProviderSuccess"] | components["schemas"]["ProviderFailure"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    research_plan_research_plan_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ResearchInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ResearchPlan"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    compare_reports_research_report_diff_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReportDiffInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReportDiff"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    reports_research_reports_get: {
        parameters: {
            query?: {
                run_id?: string | null;
            };
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReportSummary"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_report_research_reports__identity__get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReportJob"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    cancel_report_research_reports__identity__cancel_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReportJob"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    report_evidence_research_reports__identity__evidence__reference__get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
                reference: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReportOriginal"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    export_report_research_reports__identity__markdown_get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReportMarkdown"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    research_runs_research_runs_get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ResearchSummary"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    start_research_research_runs_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ResearchInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ResearchRun"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_research_research_runs__identity__get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ResearchRun"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    abandon_research_research_runs__identity__abandon_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RecoveryAction"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ResearchRun"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    cancel_research_research_runs__identity__cancel_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ResearchRun"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    research_checkpoint_research_runs__identity__checkpoint_get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RecoveryView"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    research_data_research_runs__identity__data__capability__get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
                capability: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ResearchData"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    generate_report_research_runs__identity__reports_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReportGenerate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReportJob"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    restart_research_research_runs__identity__restart_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RecoveryAction"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ResearchRun"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    resume_research_research_runs__identity__resume_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RecoveryAction"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ResearchRun"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    strategies_research_strategies_get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ResearchStrategy"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    screening_list_screening_runs_get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ScreeningSummary"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    screening_start_screening_runs_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ScreeningInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ScreeningRun"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    screening_get_screening_runs__identity__get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ScreeningRun"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    screening_cancel_screening_runs__identity__cancel_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ScreeningRun"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    screening_evidence_screening_runs__identity__evidence__read_id__get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
                read_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ScreeningEvidence"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    screening_tasks_screening_tasks_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ScreeningContext"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ScreeningTask"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    sessions_sessions_get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SessionDTO"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_session_sessions_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateSession"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SessionDTO"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    session_sessions__session_id__get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                session_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SessionDTO"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    delete_session_sessions__session_id__delete: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                session_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    messages_sessions__session_id__messages_get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                session_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MessageDTO"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    runs_sessions__session_id__runs_get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                session_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RunDTO"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    start_run_sessions__session_id__runs_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                session_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StartRun"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RunDTO"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    run_sessions__session_id__runs__run_id__get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                session_id: string;
                run_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RunDTO"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    cancel_run_sessions__session_id__runs__run_id__cancel_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                session_id: string;
                run_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RunDTO"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    event_log_sessions__session_id__runs__run_id__event_log_get: {
        parameters: {
            query?: {
                after_sequence?: number;
                limit?: number;
            };
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                session_id: string;
                run_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EventPage"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    stream_events_sessions__session_id__runs__run_id__events_get: {
        parameters: {
            query?: {
                after_sequence?: number;
                follow?: boolean;
            };
            header?: {
                "last-event-id"?: string | null;
                "x-researchtrail-token"?: string | null;
            };
            path: {
                session_id: string;
                run_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/event-stream": string;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    session_snapshot_sessions__session_id__snapshot_get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                session_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SessionSnapshot"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    connections_settings_connections_get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConnectionView"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    save_connection_settings_connections__kind__put: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                kind: "model" | "market" | "account" | "skills" | "runtime";
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ConnectionInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConnectionView"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    delete_connection_settings_connections__kind__delete: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                kind: "model" | "market" | "account" | "skills" | "runtime";
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConnectionView"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    save_credential_settings_connections__kind__credential_put: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                kind: "model" | "market" | "account" | "skills" | "runtime";
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CredentialInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConnectionView"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    delete_credential_settings_connections__kind__credential_delete: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                kind: "model" | "market" | "account" | "skills" | "runtime";
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConnectionView"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    test_connection_settings_connections__kind__test_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                kind: "model" | "market" | "account" | "skills" | "runtime";
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConnectionView"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    diagnostics_settings_diagnostics_get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Diagnostics"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    profile_settings_profile_get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Profile"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    save_profile_settings_profile_put: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["Profile"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Profile"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    delete_profile_settings_profile_delete: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Profile"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    provider_profiles_settings_providers_get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProviderProfile"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    save_provider_settings_providers__provider__put: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                provider: "longbridge" | "longbridge-account" | "massive";
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProviderConfiguration"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProviderProfile"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    delete_provider_settings_providers__provider__delete: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                provider: "longbridge" | "longbridge-account" | "massive";
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProviderProfile"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    provider_credential_settings_providers__provider__credential_put: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                provider: "longbridge" | "longbridge-account" | "massive";
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProviderCredentials"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProviderProfile"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    delete_provider_credential_settings_providers__provider__credential_delete: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                provider: "longbridge" | "longbridge-account" | "massive";
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProviderProfile"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    skills_skills_get: {
        parameters: {
            query?: {
                mode?: "simulated" | "real";
                provider?: "longbridge" | "longbridge-account" | "massive";
            };
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SkillView"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    skill_enable_skills__identity__enabled_put: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SkillToggle"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SkillView"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    skill_resource_skills__identity__resource_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SkillRead"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SkillResource"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    theses_theses_get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ThesisSummary"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_thesis_theses_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ThesisCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ThesisView"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    thesis_theses__identity__get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ThesisView"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    edit_thesis_theses__identity__edit_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ThesisEdit"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ThesisView"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    evaluate_thesis_theses__identity__evaluate_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ThesisEvaluate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ThesisReview"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    judge_thesis_theses__identity__judge_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ThesisJudge"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ThesisView"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    thesis_review_theses__identity__reviews__review_id__get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
                review_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ThesisReview"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    thesis_version_theses__identity__versions__version__get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path: {
                identity: string;
                version: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ThesisVersion"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    today_today_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TodayInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TodayView"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    workspace_state_workspace_get: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkspaceState"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    security_page_workspace_page_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SecurityQuery"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecurityPage"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    select_security_workspace_selection_put: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SymbolInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkspaceState"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    add_watch_workspace_watchlist_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SymbolInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkspaceState"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    remove_watch_workspace_watchlist_remove_post: {
        parameters: {
            query?: never;
            header?: {
                "x-researchtrail-token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SymbolInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkspaceState"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
}
