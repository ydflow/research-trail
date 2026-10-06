import type { components } from '../../../packages/contracts/generated';
export type CapabilityState = components['schemas']['CapabilityState'];
export type SkillView = components['schemas']['SkillView'];
export type SkillContext = Required<Pick<components['schemas']['SkillRead'], 'mode' | 'provider'>>;
export type SkillResource = components['schemas']['SkillResource'];
