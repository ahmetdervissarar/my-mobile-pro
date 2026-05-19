import {
  BETA_DISCLAIMER,
  makeUnavailableResult,
  type IPriceProvider,
  type PriceQuery,
  type PriceResult,
} from './types.js';
import { BetaReferencePriceProvider } from './providers/betaReferencePriceProvider.js';
import { CamgozJojProvider } from './providers/camgozJojProvider.js';
import { LastKnownPriceProvider } from './providers/lastKnownPriceProvider.js';
import { ManualBetaPriceProvider } from './providers/manualBetaPriceProvider.js';

export interface PriceProviderServiceOptions {
  camgozJoj?: CamgozJojProvider;
  manualBeta?: ManualBetaPriceProvider;
  lastKnown?: LastKnownPriceProvider;
  betaReference?: BetaReferencePriceProvider;
  extras?: IPriceProvider[];
}

export interface PriceResolveResponse {
  result: PriceResult;
  disclaimer: string;
  triedProviders: string[];
}

export class PriceProviderService {
  private readonly chain: IPriceProvider[];
  private readonly lastKnown: LastKnownPriceProvider;
  public readonly manualBeta: ManualBetaPriceProvider;

  constructor(opts: PriceProviderServiceOptions = {}) {
    const camgoz = opts.camgozJoj ?? new CamgozJojProvider();
    const manual = opts.manualBeta ?? new ManualBetaPriceProvider();
    const lastKnown = opts.lastKnown ?? new LastKnownPriceProvider();
    const betaRef = opts.betaReference ?? new BetaReferencePriceProvider();

    this.manualBeta = manual;
    this.lastKnown = lastKnown;

    this.chain = [
      camgoz,
      ...(opts.extras ?? []),
      manual,
      lastKnown,
      betaRef,
    ];
  }

  async resolve(query: PriceQuery): Promise<PriceResolveResponse> {
    const triedProviders: string[] = [];

    for (const provider of this.chain) {
      if (!provider.isEnabled()) continue;

      triedProviders.push(provider.name);

      try {
        const result = await provider.fetch(query);

        if (result && result.price !== null) {
          if (provider.name !== 'last_known') {
            this.lastKnown.remember(query, result);
          }

          return {
            result,
            disclaimer: BETA_DISCLAIMER,
            triedProviders,
          };
        }
      } catch (err) {
        console.warn(
          `[PriceProviderService] provider failed: ${provider.name}`,
          (err as Error).message,
        );
      }
    }

    return {
      result: makeUnavailableResult(query),
      disclaimer: BETA_DISCLAIMER,
      triedProviders,
    };
  }
}