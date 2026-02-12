-- Migration 015: Wallet Transactions table
-- QwickServices CIS — Mobile-money/wallet activity (new blind-spot data)

CREATE TYPE wallet_tx_type AS ENUM ('deposit', 'withdrawal', 'transfer', 'payment', 'refund');
CREATE TYPE wallet_tx_status AS ENUM ('pending', 'completed', 'failed', 'reversed');

CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(255) UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id),
    counterparty_id UUID REFERENCES users(id),
    tx_type wallet_tx_type NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status wallet_tx_status NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_tx_user ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_tx_counterparty ON wallet_transactions(counterparty_id);
CREATE INDEX idx_wallet_tx_type ON wallet_transactions(tx_type);
CREATE INDEX idx_wallet_tx_status ON wallet_transactions(status);
CREATE INDEX idx_wallet_tx_created ON wallet_transactions(created_at);

CREATE TRIGGER trg_wallet_transactions_updated_at
    BEFORE UPDATE ON wallet_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
