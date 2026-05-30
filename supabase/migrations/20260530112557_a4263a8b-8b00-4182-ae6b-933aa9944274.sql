
DO $$
DECLARE
  new_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user, is_anonymous
  ) VALUES (
    new_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'rueckwaertsfahrer@example.com',
    crypt('Demo!' || new_id::text, gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"rueckwaertsfahrer","display_name":"Rückwärtsfahrer"}'::jsonb,
    false, false, false
  );

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (
    gen_random_uuid(), new_id,
    jsonb_build_object('sub', new_id::text, 'email', 'rueckwaertsfahrer@example.com'),
    'email', new_id::text, now(), now(), now()
  );

  -- profile is auto-created by handle_new_user trigger; update bio
  UPDATE public.profiles SET bio = 'Neugieriger Auto-Newbie' WHERE id = new_id;

  INSERT INTO public.forum_questions (author_id, title, body, tags)
  VALUES (
    new_id,
    'Kann ich den Kilometerstand zurückdrehen, indem ich rückwärts fahre?',
    'Hey Leute, ehrlich gemeinte Frage: Wenn ich rückwärts fahre, zählt der Tacho dann auch rückwärts und ich kann so den Kilometerstand reduzieren? Oder ist das nur ein Mythos? Habe das mal in einem alten Film gesehen und frage mich, ob da was dran ist. Danke für eure Hilfe!',
    ARRAY['Tacho','Kilometerstand','Mythos']
  );
END $$;
