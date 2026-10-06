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
        /** EventPage */
        EventPage: {
            /** Events */
            events: (components["schemas"]["RunStartedEvent"] | components["schemas"]["MessageStartedEvent"] | components["schemas"]["StatusEvent"] | components["schemas"]["TextDeltaEvent"] | components["schemas"]["MessageCompletedEvent"] | components["schemas"]["RunCompletedEvent"] | components["schemas"]["ToolStartedEvent"] | components["schemas"]["ToolResultEvent"] | components["schemas"]["ErrorEvent"] | components["schemas"]["CancelledEvent"])[];
            /** Last Sequence */
            last_sequence: number;
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
        /** PartialText */
        PartialText: {
            /** Text */
            text: string;
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
            input: components["schemas"]["ResearchInput"];
            /**
             * Label
             * @default 仅结构化数据采集；策略名称不代表指标、投资结论或报告已实现
             */
            label: string;
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
            /** Completed */
            completed: number;
            /** Completed At */
            completed_at: string | null;
            /** Failed */
            failed: number;
            /** Id */
            id: string;
            /**
             * Mode
             * @enum {string}
             */
            mode: "simulated" | "real";
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
            /** Completed */
            completed: number;
            /** Completed At */
            completed_at: string | null;
            /** Failed */
            failed: number;
            /** Id */
            id: string;
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
