-- Somente leitura. Executar no projeto correto APENAS após autorização.
-- Não imprime fichas, descrições ou fotos; retorna identificadores e contagens para revisão do mestre.
begin transaction read only;
select current_database() as banco,version() as versao_postgres;
select p.id,p.campanha_id,
 jsonb_typeof(p.ficha) as formato_ficha,jsonb_typeof(p.inventario) as formato_inventario,
 jsonb_typeof(p.ficha->'magiasMestre') as formato_concessoes,jsonb_typeof(p.ficha->'magias') as formato_magias
from public.personagens p
where jsonb_typeof(p.ficha)<>'object' or jsonb_typeof(p.inventario)<>'array'
 or (p.ficha ? 'magiasMestre' and p.ficha->'magiasMestre'<>'null'::jsonb and jsonb_typeof(p.ficha->'magiasMestre')<>'array')
 or (p.ficha ? 'magias' and p.ficha->'magias'<>'null'::jsonb and jsonb_typeof(p.ficha->'magias')<>'array');
with itens as (
 select p.id,p.campanha_id,i from public.personagens p
 cross join lateral jsonb_array_elements(case when jsonb_typeof(p.inventario)='array' then p.inventario else '[]'::jsonb end) i
)
select id,campanha_id,
 count(*) filter(where i#>'{propriedades,efeitos}' is not null) as itens_com_efeitos,
 count(*) filter(where i#>'{propriedades,efeitos}' is not null and nullif(i->>'uid','') is null) as efeitos_sem_uid,
 count(*)-count(distinct i->>'uid') as uids_ausentes_ou_repetidos
from itens group by id,campanha_id having count(*) filter(where i#>'{propriedades,efeitos}' is not null)>0;
-- Toda concessão anterior à proteção precisa ter sua origem confirmada pelo mestre responsável.
select p.id,p.campanha_id,
 jsonb_array_length(case when jsonb_typeof(p.ficha->'magiasMestre')='array' then p.ficha->'magiasMestre' else '[]'::jsonb end) as concessoes,
 (select count(*) from jsonb_array_elements(case when jsonb_typeof(p.ficha->'magias')='array' then p.ficha->'magias' else '[]'::jsonb end) m where (m->>'fonte'='mestre' or m ? 'concessao')) as copias_mestre
from public.personagens p where coalesce(p.ficha->'magiasMestre','[]'::jsonb) not in ('[]'::jsonb,'null'::jsonb)
 or exists(select 1 from jsonb_array_elements(case when jsonb_typeof(p.ficha->'magias')='array' then p.ficha->'magias' else '[]'::jsonb end) m where (m->>'fonte'='mestre' or m ? 'concessao'));
with listas as (
 select p.id,p.campanha_id,k.chave,m from public.personagens p
 cross join (values('magiasMestre'),('magias')) k(chave)
 cross join lateral jsonb_array_elements(case when jsonb_typeof(p.ficha->k.chave)='array' then p.ficha->k.chave else '[]'::jsonb end) m
), usos as (
 select *,m#>'{concessao,usos}' u from listas where chave='magiasMestre' or m->>'fonte'='mestre' or m ? 'concessao'
)
select id,campanha_id,chave,count(*) as entradas_a_revisar from usos
where jsonb_typeof(m)<>'object' or (u is not null and not (
 case when jsonb_typeof(u->'usados')='number' and (u->'usados')::text ~ '^[0-9]{1,9}$'
 and jsonb_typeof(u->'max')='number' and (u->'max')::text ~ '^[0-9]{1,9}$'
 then (u->>'usados')::numeric between 0 and (u->>'max')::numeric else false end))
group by id,campanha_id,chave;
rollback;
