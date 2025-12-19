-- Replace or create the consolidated view used by the frontend
-- Shows every booking together with pickup & drop-off coordinates/radius
-- so the mobile app can register / evaluate geofences easily.

create or replace view v_booking_with_coords as
select
    b.id,
    b.user_id,
    b.user_email,
    b.pickup_time,
    b.department,
    b.pickup_location,
    b.dropoff_location,
    b.booking_date,
    b.needs_escort,
    b.dropped_off,
    b.created_at,

    -- UUID FKs – exposed for debugging / admin usage
    b.pickup_location_id,
    b.dropoff_location_id,

    -- Pickup site geo meta
    p.lat  as pickup_lat,
    p.lng  as pickup_lng,
    p.radius_m as pickup_radius,

    -- Drop-off site geo meta (used by background geofence)
    d.lat  as dropoff_lat,
    d.lng  as dropoff_lng,
    d.radius_m as dropoff_radius
from cab_bookings as b
left join cab_locations as p on p.id = b.pickup_location_id
left join cab_locations as d on d.id = b.dropoff_location_id;

-- Grant SELECT to anonymous / authenticated roles as needed (Supabase default is post-auth)
-- For Supabase:
--   alter view v_booking_with_coords owner to postgres;
--   grant select on v_booking_with_coords to authenticated;
--   -- And, if admins need it without RLS, to service_role
--   grant select on v_booking_with_coords to service_role;