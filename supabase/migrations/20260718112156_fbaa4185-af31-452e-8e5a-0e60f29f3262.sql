
DO $$
DECLARE
  usernames text[] := ARRAY[
    'akira_nova','levi_haze','rei_sato','spike_mori','asuka_lane',
    'guts_harada','luffy_ren','mikasa_kei','edward_sora','yato_shin',
    'luna_wave','neo_pixel','maru_kai','kento_live','mira_echo'
  ];
  uname text;
  new_uid uuid;
BEGIN
  FOREACH uname IN ARRAY usernames LOOP
    IF EXISTS (SELECT 1 FROM public.profiles WHERE username = uname) THEN
      CONTINUE;
    END IF;
    new_uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      new_uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated','authenticated',
      uname || '@sim.carforms.de',
      crypt(gen_random_uuid()::text, gen_salt('bf')),
      now(),
      jsonb_build_object('provider','email','providers',ARRAY['email']),
      jsonb_build_object('username', uname, 'display_name', uname),
      now() - (random() * interval '40 days'),
      now(), '', '', '', ''
    );
  END LOOP;
END $$;
