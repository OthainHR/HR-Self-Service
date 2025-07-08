alter table cab_booking_whitelist
  add column drop_off_location_id uuid references cab_locations(id);

alter table cab_bookings
  add column dropoff_location_id  uuid references cab_locations(id),
  add column pickup_location_id   uuid references cab_locations(id);