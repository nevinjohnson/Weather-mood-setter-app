-- Create a public-read storage bucket for crush photos
-- Note: Requires postgres role with appropriate privileges (service role on the server will execute storage ops in app code)
select
  case
    when not exists (select 1 from storage.buckets where id = 'crush-photos')
    then storage.create_bucket('crush-photos', public => true)
    else null
  end;

-- Public-read bucket provides read policy automatically. We rely on server (service role) to write uploads.
-- No additional RLS policies needed for tables since server handles CRUD.
