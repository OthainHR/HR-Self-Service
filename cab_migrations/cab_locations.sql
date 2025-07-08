create table cab_locations (
  id          uuid primary key default uuid_generate_v4(),
  role        text    check (role in ('pickup','dropoff')),
  name        text    unique not null,          -- “Building #9”, “KPHB”… same strings you already use
  lat         double precision not null,
  lng         double precision not null,
  radius_m    int default 60,                   -- metres; tweak per site
  created_at  timestamptz default now()
);