-- Executive Dashboard Redesign Sprint ED-R3: minimal MANUAL financial watchlist.
-- No banking or payment provider integration exists anywhere in this codebase (confirmed by
-- repo-wide search for Stripe/Paddle/Razorpay/bank-account domain entities -- none found). Per the
-- sprint's critical constraint ("must not imply live bank integration unless a real banking
-- provider exists"), this is a manually-entered watchlist a tenant maintains themselves, not a
-- bank feed. The dashboard layer must always label this "manual tracking," never "bank connected."

create table if not exists public.financial_watch_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  category text not null check (category in ('budget', 'bank_balance', 'accounts_actionable', 'other')),
  threshold_type text not null check (threshold_type in ('below', 'above')),
  threshold_amount numeric not null,
  current_amount numeric,
  currency text not null default 'USD',
  status text not null default 'open' check (status in ('open', 'resolved')),
  owner_user_id uuid references public.users(id) on delete set null,
  due_at timestamptz,
  notes text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists financial_watch_items_org_idx on public.financial_watch_items(organization_id);
create index if not exists financial_watch_items_status_idx on public.financial_watch_items(organization_id, status);

alter table public.financial_watch_items enable row level security;

drop policy if exists financial_watch_items_member_select on public.financial_watch_items;
create policy financial_watch_items_member_select on public.financial_watch_items for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists financial_watch_items_member_insert on public.financial_watch_items;
create policy financial_watch_items_member_insert on public.financial_watch_items for insert to authenticated
  with check (
    public.is_org_member(organization_id)
    and (
      created_by is null
      or created_by = (select auth.uid())
      or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin'])
    )
  );

drop policy if exists financial_watch_items_member_update on public.financial_watch_items;
create policy financial_watch_items_member_update on public.financial_watch_items for update to authenticated
  using (
    owner_user_id = (select auth.uid())
    or created_by = (select auth.uid())
    or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager'])
  )
  with check (
    public.is_org_member(organization_id)
    and (
      owner_user_id = (select auth.uid())
      or created_by = (select auth.uid())
      or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager'])
    )
  );

comment on table public.financial_watch_items is 'Executive Dashboard Redesign Sprint ED-R3: manually-entered tenant financial watchlist (budget/bank-balance/accounts thresholds). NOT a bank feed -- no banking provider integration exists in this codebase. Dashboard tiles built on this table must be labeled "manual tracking," never "bank connected."';
