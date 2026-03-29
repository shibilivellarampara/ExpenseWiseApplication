
import { AssetType } from "./types";

export const ASSET_TYPES: Record<AssetType, { label: string; icon: string }> = {
    savings_cash: { label: 'Savings & Cash', icon: 'Wallet' },
    mutual_funds: { label: 'Mutual Funds', icon: 'AreaChart' },
    stocks_equity: { label: 'Stocks & Equity', icon: 'Activity' },
    fixed_income: { label: 'Fixed Income', icon: 'Landmark' },
    retirement: { label: 'Long-Term', icon: 'PiggyBank' },
    digital_assets: { label: 'Digital Assets', icon: 'Bitcoin' },
    gold: { label: 'Gold', icon: 'Gem' },
    private_equity: { label: 'Private Equity', icon: 'Building2' },
    other: { label: 'Other Assets', icon: 'Briefcase' },
};
