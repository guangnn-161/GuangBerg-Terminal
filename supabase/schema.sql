-- ========================================================
-- SUPABASE SCHEMA - PORTFOLIO DATABASE & ROW LEVEL SECURITY
-- Quang Nguyen - Research Consultant @ WorldQuant
-- ========================================================

-- 1. BẢNG HỒ SƠ CÁ NHÂN (1 DÒNG DUY NHẤT)
create table if not exists profile (
  id int primary key default 1,
  name text,
  ticker text,
  title text,
  location text,
  status text,
  quote text,
  quote_author text,
  bio text[],
  email text,
  linkedin text,
  github text,
  updated_at timestamptz default now(),
  constraint single_row check (id = 1)
);

-- 2. BẢNG DỰ ÁN (PROJECTS)
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  code text,
  name text not null,
  summary text,
  stack text[],
  result text,
  link text,
  sort_order int default 0,
  published boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. BẢNG TIMELINE (KINH NGHIỆM & HỌC VẤN)
create table if not exists timeline (
  id uuid primary key default gen_random_uuid(),
  kind text check (kind in ('work','education')),
  period text,
  role text,
  org text,
  points text[],
  sort_order int default 0
);

-- 4. BẢNG KỸ NĂNG (SKILLS)
create table if not exists skills (
  id uuid primary key default gen_random_uuid(),
  category text,
  name text,
  level int,
  sort_order int default 0
);

-- 5. BẢNG GHI CHÚ / BÀI VIẾT (KHO KIẾN THỨC RESEARCH)
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  title text not null,
  body_md text,
  tags text[],
  is_public boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. BẢNG SIÊU DỮ LIỆU KHO FILE (VAULT FILES)
create table if not exists vault_files (
  id uuid primary key default gen_random_uuid(),
  path text unique not null,
  title text,
  description text,
  tags text[],
  size_bytes bigint,
  mime text,
  is_public boolean default false,
  created_at timestamptz default now()
);

-- 7. BẢNG HỘP THƯ LIÊN HỆ (MESSAGES)
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  sender text,
  body text,
  created_at timestamptz default now(),
  read boolean default false
);

-- TỰ ĐỘNG CẬP NHẬT UPDATED_AT
create or replace function touch_updated_at() returns trigger as $$
begin 
  new.updated_at = now(); 
  return new; 
end; 
$$ language plpgsql;

drop trigger if exists t_projects on projects;
create trigger t_projects before update on projects for each row execute function touch_updated_at();

drop trigger if exists t_notes on notes;
create trigger t_notes before update on notes for each row execute function touch_updated_at();

drop trigger if exists t_profile on profile;
create trigger t_profile before update on profile for each row execute function touch_updated_at();

-- ========================================================
-- PHÂN QUYỀN ROW LEVEL SECURITY (RLS)
-- ========================================================

alter table profile      enable row level security;
alter table projects     enable row level security;
alter table timeline     enable row level security;
alter table skills       enable row level security;
alter table notes        enable row level security;
alter table vault_files  enable row level security;
alter table messages     enable row level security;

-- HÀM KIỂM TRA CHỦ SỞ HỮU (Dựa trên tài khoản Supabase Auth của bạn)
create or replace function is_owner() returns boolean as $$
  select auth.role() = 'authenticated';
$$ language sql stable;

-- CHÍNH SÁCH ĐỌC CÔNG KHAI
create policy "public read profile"  on profile  for select using (true);
create policy "public read projects" on projects for select using (published or is_owner());
create policy "public read timeline" on timeline for select using (true);
create policy "public read skills"   on skills   for select using (true);
create policy "public read notes"    on notes    for select using (is_public or is_owner());
create policy "public read vault"    on vault_files for select using (is_public or is_owner());

-- CHÍNH SÁCH GHI: CHỈ OWNER ĐÃ ĐĂNG NHẬP MỚI ĐƯỢC PHÉP
create policy "owner write profile"  on profile  for all using (is_owner()) with check (is_owner());
create policy "owner write projects" on projects for all using (is_owner()) with check (is_owner());
create policy "owner write timeline" on timeline for all using (is_owner()) with check (is_owner());
create policy "owner write skills"   on skills   for all using (is_owner()) with check (is_owner());
create policy "owner write notes"    on notes    for all using (is_owner()) with check (is_owner());
create policy "owner write vault"    on vault_files for all using (is_owner()) with check (is_owner());

-- HỘP THƯ TIN NHẮN
create policy "anyone send message" on messages for insert
  with check (length(body) between 1 and 2000 and length(sender) <= 100);
create policy "owner read messages" on messages for select using (is_owner());
create policy "owner manage messages" on messages for update using (is_owner());
create policy "owner delete messages" on messages for delete using (is_owner());
