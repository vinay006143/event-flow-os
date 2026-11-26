import { type IEventConfig } from './event.model.js';
import type { Request } from 'express';
export declare const DEFAULT_REGISTRATION_FIELDS: ({
    key: string;
    label: string;
    type: "text";
    required: boolean;
    placeholder: string;
    displayOrder: number;
    enabled: boolean;
    min?: undefined;
    max?: undefined;
} | {
    key: string;
    label: string;
    type: "number";
    required: boolean;
    placeholder: string;
    min: number;
    max: number;
    displayOrder: number;
    enabled: boolean;
} | {
    key: string;
    label: string;
    type: "phone";
    required: boolean;
    placeholder: string;
    displayOrder: number;
    enabled: boolean;
    min?: undefined;
    max?: undefined;
} | {
    key: string;
    label: string;
    type: "email";
    required: boolean;
    placeholder: string;
    displayOrder: number;
    enabled: boolean;
    min?: undefined;
    max?: undefined;
})[];
export declare function getOrCreateEventConfig(): Promise<IEventConfig>;
export declare function updateEventConfig(updates: Partial<IEventConfig>, actor: {
    id: string;
    email: string;
}, req?: Request): Promise<IEventConfig>;
//# sourceMappingURL=event.service.d.ts.map