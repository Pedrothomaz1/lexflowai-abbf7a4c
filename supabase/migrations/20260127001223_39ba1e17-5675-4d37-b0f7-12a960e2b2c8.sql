-- Adicionar campos de dados bancários à tabela fornecedores
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS banco TEXT;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS agencia TEXT;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS conta TEXT;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS pix TEXT;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS titular_conta TEXT;