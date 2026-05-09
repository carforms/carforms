DO $$
DECLARE
  usernames text[] := ARRAY[
    'jdm_claas','tokyodrift_kai','stance_muenchen','r34_lover','hakosuka_fan',
    'nuerburgring_pete','ae86_tokyo','widebody_felix','cleanspec_anna',
    'drift_queen_sara','rotary_rob','bosozoku_ben'
  ];
  display_names text[] := ARRAY[
    'Claas Hendriks','Kai Yamamoto','Stance München','Robin Keller','Hakosuka Fan',
    'Peter Nordmann','Aoi Takeda','Felix Hoffmann','Anna Schreiber',
    'Sara Lindqvist','Robert Mazda','Ben Tanaka'
  ];
  bios text[] := ARRAY[
    'JDM bis ans Lebensende. RB26 forever.',
    'Drift, Stance, Tokyo by Night. Mehr brauche ich nicht.',
    'Stance Crew München. Camber > Funktion.',
    'R34 Eigentümer und obsessed seit 15 Jahren.',
    'Hakosuka, Kenmeri, alles 70er. Liebe das Patina.',
    'Nordschleifen-Stammgast. Cup-Reifen sind mein Wasser.',
    'AE86 Hachi-Roku in Tokyo Style. Initial D Vibes.',
    'Widebody Builds und Air Suspension. Form folgt Funktion? Nein.',
    'Sauber, tief, schlicht. Cleanspec Philosophie.',
    'Drift Queen aus Berlin. E36 mit hydraulischer Handbremse.',
    'Wankel-Predigt. RX-7 FD3S Dauerprojekt.',
    'Bosozoku Builds. Je verrückter, desto besser.'
  ];
  user_ids uuid[] := ARRAY[]::uuid[];
  new_uid uuid;
  i int;
  j int;
  follower_count int;
  followee int;
  comments_text text[] := ARRAY[
    'Absolut legendär 🔥',
    'Krasser Build! Wo hast du das Teil her?',
    'Respect für den Aufwand 🙌',
    'Bro, das ist sauberste Arbeit die ich heute gesehen habe.',
    'Endlich mal jemand der das richtig macht!',
    'Holy moly – Felgen Specs?',
    'Wann kommt das nächste Update?',
    'Brauche unbedingt ein Setup-Sheet 😍',
    'Goosebumps. Einfach perfekt.',
    'Das wäre ein Traum in meiner Garage.',
    'Sound vom Auspuff bitte als Klingelton 😂',
    'Camber to the moon!',
    'Kannst du mehr Details zum Motor geben?',
    'Bin Fan! Folge dir ab jetzt.'
  ];
  post_titles text[] := ARRAY[
    'Warum der R34 GTR zeitlos ist',
    'JDM vs Euro – wer gewinnt?',
    'Mein AE86 Projekt – Update #3',
    'Die Kunst des Stance',
    'Bosozoku – Japans wildeste Autokultur',
    'Hakosuka Restauration: Erste Schritte',
    'RB26DETT vs 2JZ – die ewige Debatte',
    'Air Suspension oder Coilovers?',
    'Mein FD3S nach 5 Jahren – Status Update',
    'Tokyo Auto Salon 2026 – meine Highlights',
    'Wie ich meinen E30 zum Show-Car umgebaut habe',
    'Camber Gang oder Functional Build?',
    'Initial D Spots in Japan, die wirklich existieren',
    'Mein erster Trackday auf der Nordschleife',
    'Widebody Kit – DIY oder Profi?',
    'Cleanspec Philosophie: weniger ist mehr',
    'Drift-Setup für Anfänger',
    'Welche Felge passt zu welchem Stil?',
    'Mein Kenmeri Skyline ist endlich da',
    'JDM Importzoll & TÜV – mein Erfahrungsbericht',
    'Bosozoku Auspuff: Lärm oder Kunst?',
    'Stance München Meet – Recap',
    'AE86 Sliding bei Nacht – Best of',
    'Restomod oder Originalzustand?',
    'Mein Mazda RX-7 Motor revidiert',
    'BMW E36 Compact Drift Build',
    'Welcher JDM Klassiker steigt am meisten im Wert?',
    'Track-Tools: Was wirklich Sinn macht',
    'Felgen-Refurbishment: vorher/nachher',
    'Warum ich nie wieder ein modernes Auto kaufe'
  ];
  post_bodies text[] := ARRAY[
    'Der R34 GTR ist für mich der Inbegriff von zeitlosem JDM Design. Die Linien, der Motor, der Sound – alles passt. Selbst nach 25 Jahren wirkt er immer noch frisch.',
    'JDM hat das Herz, Euro die Eleganz. Beide Szenen haben ihre Daseinsberechtigung, aber wenn ich wählen muss: JDM jeden Tag der Woche.',
    'Der Hachi-Roku läuft! Heute Lichtmaschine getauscht und neue Zündkerzen rein. Nächster Schritt: Fahrwerk und Felgen.',
    'Stance ist mehr als nur tief und Camber. Es geht um Proportionen, Wheel-Fitment und Liebe zum Detail. Ohne das wird es schnell billig.',
    'Bosozoku ist nicht jedermanns Sache, aber die Hingabe und Kreativität dieser Szene ist unglaublich. Reine Rebellion auf vier Rädern.',
    'Heute den Hakosuka aus dem Container geholt. Roststellen sind übersichtlich, Innenraum erstaunlich gut. Restauration kann starten!',
    'Beide Motoren sind Legenden. Der RB hat den charakteristischen Sound, der 2JZ ist unkaputtbar. Für mich klar: RB26 wegen der Geschichte.',
    'Air ist bequem und showtauglich, Coilovers sind kompromisslos. Wer fährt, nimmt Coilovers. Wer parkt, nimmt Air. Ich wechsle gerade auf Coilovers.',
    'Fünf Jahre, drei Motorrevisionen, eine Lackierung. Der FD ist mein Traum und Albtraum zugleich. Aber ich würde es wieder tun.',
    'Tokyo Auto Salon war wieder unfassbar. Liberty Walk hat wieder geliefert, RWB Porsche standen Schlange. Bilder folgen!',
    'Mein E30 hat 4 Jahre gebraucht. Komplettlackierung, M50 Swap, BBS RS Felgen, Recaro Schalen. Der Aufwand hat sich gelohnt.',
    'Camber Gang sieht gut aus, aber meine Reifen halten 3.000 km. Functional Build ist langweiliger, aber günstiger. Beides hat seinen Reiz.',
    'Akina Pass existiert wirklich, sieht aber heute ganz anders aus. Trotzdem Gänsehaut, da gefahren zu sein. Pilger-Pflicht für jeden JDM-Fan.',
    'Erstes Mal Nordschleife, M2 CS auf MPSS. 8:32 brutto. Hände zittern noch. Süchtig.',
    'Profi macht passgenau, DIY macht stolz. Ich habe es selbst gemacht und 80 Stunden gebraucht. Lerneffekt unbezahlbar.',
    'Cleanspec heißt: keine Decals, keine Spoiler, perfekte Felgen. Die Reduktion ist die Schwierigkeit, nicht das Hinzufügen.',
    'Anfänger-Setup für Drift: heckangetrieben, LSD, hydraulische Handbremse, gute Reifen vorne. Mehr braucht es am Anfang nicht.',
    'BBS RS für klassische Builds, Work Meister für Stance, Volk TE37 für Track. Stilmischung ist tabu.',
    'Endlich angekommen. Kenmeri Skyline 2000GT in Originalfarbe. Innenraum ist 90% original. Ein Traum wird wahr.',
    'Import aus Japan ging überraschend smooth. TÜV mit Einzelabnahme war die größte Hürde. Insgesamt ca. 4 Monate von Kauf bis Zulassung.',
    'Bosozoku-Auspüffe sind Kunst. Die Höhe, die Form, der Sound – nichts davon ist zufällig. Nur Nachbarn verstehen es nicht.',
    'Über 80 Autos beim Stance München Meet. Wetter perfekt, Stimmung Hammer, viele neue Kontakte. Nächstes Treffen im August.',
    'Drift bei Nacht ist die schönste Form von Auto fahren. Lichter, Reifenrauch, Sound. AE86 macht es immer noch am besten.',
    'Kommt drauf an: 911 immer Original, alle anderen darf man modden. Patina ist OK, Halbgaren-Mods sind es nicht.',
    'Motor läuft wieder! 13B-REW komplett neu, ARP Studs, neuer Kühler. Der Sound ist nicht von dieser Welt.',
    'E36 Compact als Drifter ist underrated. Leicht, kurz, günstig. Mit M52B28 Swap und LSD richtig brauchbar.',
    'R34 GTR ist im Wert explodiert. Nächste Welle: AE86 und FD RX-7. Wer jetzt kauft, gewinnt.',
    'HANS, gute Bremsflüssigkeit, vernünftige Reifen. Den Rest braucht man am Anfang wirklich nicht.',
    'BBS RS komplett zerlegt, sandgestrahlt, neu gepulvert. Vorher Schrott, nachher Schmuckstück.',
    'Moderne Autos sind anonym. Mein 30 Jahre alter JDM Klassiker hat Charakter, Sound und Geschichte. Niemals zurück.'
  ];
  post_imgs text[] := ARRAY[
    'https://source.unsplash.com/800x800/?jdm,car',
    'https://source.unsplash.com/800x800/?japan,car',
    'https://source.unsplash.com/800x800/?stance,car',
    'https://source.unsplash.com/800x800/?drift,car',
    'https://source.unsplash.com/800x800/?skyline,gtr',
    'https://source.unsplash.com/800x800/?ae86,toyota',
    'https://source.unsplash.com/800x800/?rx7,mazda',
    'https://source.unsplash.com/800x800/?bmw,e30',
    'https://source.unsplash.com/800x800/?nissan,silvia',
    'https://source.unsplash.com/800x800/?bosozoku,car'
  ];
  new_post_id uuid;
  community_ids uuid[] := ARRAY[]::uuid[];
  new_community_id uuid;
  comm_names text[] := ARRAY['JDM Culture','Euro Stance','Drift & Track'];
  comm_slugs text[] := ARRAY['jdm-culture','euro-stance','drift-track'];
  comm_descs text[] := ARRAY[
    'Alles rund um die japanische Tunerszene.',
    'European Stance Builds und Cleanspec Liebhaber.',
    'Drift, Trackdays und alles was Spaß auf der Strecke macht.'
  ];
  num_likes int;
  num_comments int;
  like_user uuid;
  comment_user uuid;
  used_likes uuid[];
BEGIN
  -- 1. Demo auth users + profiles
  FOR i IN 1..array_length(usernames, 1) LOOP
    new_uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous
    ) VALUES (
      new_uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      usernames[i] || '@demo.carforms.de',
      crypt(gen_random_uuid()::text, gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('username', usernames[i], 'display_name', display_names[i]),
      false, false
    );

    INSERT INTO public.profiles (id, username, display_name, bio, avatar_url)
    VALUES (
      new_uid,
      usernames[i],
      display_names[i],
      bios[i],
      'https://api.dicebear.com/7.x/avataaars/svg?seed=' || usernames[i]
    )
    ON CONFLICT (id) DO UPDATE SET
      username = EXCLUDED.username,
      display_name = EXCLUDED.display_name,
      bio = EXCLUDED.bio,
      avatar_url = EXCLUDED.avatar_url;

    INSERT INTO public.user_roles (user_id, role) VALUES (new_uid, 'user')
    ON CONFLICT DO NOTHING;

    user_ids := array_append(user_ids, new_uid);
  END LOOP;

  -- 2. Posts (30) over the last 45 days
  FOR i IN 1..array_length(post_titles, 1) LOOP
    new_post_id := gen_random_uuid();
    INSERT INTO public.posts (id, author_id, title, body, image_url, created_at)
    VALUES (
      new_post_id,
      user_ids[1 + floor(random() * array_length(user_ids, 1))::int],
      post_titles[i],
      post_bodies[i],
      post_imgs[1 + floor(random() * array_length(post_imgs, 1))::int],
      now() - (random() * interval '45 days')
    );

    -- 4. Likes per post (3–12)
    num_likes := 3 + floor(random() * 10)::int;
    used_likes := ARRAY[]::uuid[];
    FOR j IN 1..num_likes LOOP
      like_user := user_ids[1 + floor(random() * array_length(user_ids, 1))::int];
      IF NOT (like_user = ANY(used_likes)) THEN
        used_likes := array_append(used_likes, like_user);
        INSERT INTO public.post_likes (post_id, user_id)
        VALUES (new_post_id, like_user)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;

    -- 5. Comments per post (1–4)
    num_comments := 1 + floor(random() * 4)::int;
    FOR j IN 1..num_comments LOOP
      comment_user := user_ids[1 + floor(random() * array_length(user_ids, 1))::int];
      INSERT INTO public.post_comments (post_id, user_id, body, created_at)
      VALUES (
        new_post_id,
        comment_user,
        comments_text[1 + floor(random() * array_length(comments_text, 1))::int],
        now() - (random() * interval '40 days')
      );
    END LOOP;
  END LOOP;

  -- 3. Follow relationships (4–8 per user, no self-follow)
  FOR i IN 1..array_length(user_ids, 1) LOOP
    follower_count := 4 + floor(random() * 5)::int;
    FOR j IN 1..follower_count LOOP
      followee := 1 + floor(random() * array_length(user_ids, 1))::int;
      IF user_ids[followee] <> user_ids[i] THEN
        INSERT INTO public.follows (follower_id, following_id)
        VALUES (user_ids[i], user_ids[followee])
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;

  -- 6. Communities + memberships
  FOR i IN 1..array_length(comm_names, 1) LOOP
    new_community_id := gen_random_uuid();
    INSERT INTO public.communities (id, slug, name, description, created_by)
    VALUES (
      new_community_id,
      comm_slugs[i],
      comm_names[i],
      comm_descs[i],
      user_ids[1 + floor(random() * array_length(user_ids, 1))::int]
    );
    community_ids := array_append(community_ids, new_community_id);

    -- Add ALL demo users as members
    FOR j IN 1..array_length(user_ids, 1) LOOP
      INSERT INTO public.community_members (community_id, user_id, role)
      VALUES (new_community_id, user_ids[j], CASE WHEN j = 1 THEN 'owner' ELSE 'member' END)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Seed complete: % users, % posts, % communities',
    array_length(user_ids, 1),
    array_length(post_titles, 1),
    array_length(community_ids, 1);
END $$;
