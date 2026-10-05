import type { components } from '../../../packages/contracts/generated';
export type ProviderProfile = components['schemas']['ProviderProfile'];
export type ProviderId = ProviderProfile['provider'];
export type ProviderConfiguration = components['schemas']['ProviderConfiguration'];
export type ProviderCredentials = components['schemas']['ProviderCredentials'];
export type ReadQuery = components['schemas']['ReadQuery'];
export type CapabilityView = components['schemas']['CapabilityView'];
export type ProviderResult = components['schemas']['ProviderSuccess'] | components['schemas']['ProviderFailure'];
