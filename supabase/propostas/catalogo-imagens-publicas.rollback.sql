-- Rollback da proposta: remove só a função (não toca em tabelas, dados, policies nem no bucket).
begin;
drop function if exists public.catalogo_imagens_publicas();
commit;
