update cab_booking_whitelist w
set    drop_off_location_id = l.id
from   cab_locations l
where  lower(l.name) = lower(w.drop_off_location);

UPDATE cab_bookings   AS b
SET    dropoff_location_id = l_drop.id,
       pickup_location_id  = l_pick.id
FROM   cab_locations AS l_drop,
       cab_locations AS l_pick
WHERE  l_drop.name = b.dropoff_location::text      -- ← cast enum → text
  AND  l_pick.name = b.pickup_location::text;      -- ← cast enum → text