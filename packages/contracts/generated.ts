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
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
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
}
