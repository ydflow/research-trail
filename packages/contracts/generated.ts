/** Generated from Python OpenAPI by scripts/contracts.mjs. Do not edit. */
export interface paths {
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
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
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
        /** CompletedPayload */
        CompletedPayload: {
            /**
             * Stop Reason
             * @enum {string}
             */
            stop_reason: "completed" | "error" | "cancelled" | "timeout" | "interrupted";
        };
        /** CreateSession */
        CreateSession: {
            /**
             * Title
             * @default 新会话
             */
            title: string;
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
        /** PartialText */
        PartialText: {
            /** Text */
            text: string;
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
            kind: "fixture" | "fake_agent";
            /** Last Sequence */
            last_sequence: number;
            /** Model Label */
            model_label?: "规则演示／假模型" | null;
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
        /** StartRun */
        StartRun: {
            /** Input */
            input: string;
            /**
             * Kind
             * @default fixture
             * @enum {string}
             */
            kind: "fixture" | "fake_agent";
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
            name: "market.quote" | "market.kline";
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
            input: components["schemas"]["ToolArguments"];
            /**
             * Name
             * @enum {string}
             */
            name: "market.quote" | "market.kline";
        };
        /** ToolSuccess */
        ToolSuccess: {
            /** Data */
            data: components["schemas"]["QuoteToolData"] | components["schemas"]["KlineToolData"];
            /**
             * Ok
             * @default true
             * @constant
             */
            ok: true;
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
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
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
}
