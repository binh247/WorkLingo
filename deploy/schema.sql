-- =====================================================================
-- WorkLingo — schema.sql (cấu trúc database đầy đủ)
-- Sinh từ: pg_dump --schema-only + sổ migration Drizzle
--
-- CÁCH DÙNG (môi trường mới, database RỖNG):
--   1) docker compose up -d        (hoặc Postgres có sẵn)
--   2) Tạo DB rỗng nếu chưa có:
--        createdb -U worklingo worklingo
--   3) Nạp schema:
--        psql -U worklingo -d worklingo -f deploy/schema.sql
--      (qua docker: docker exec -i worklingo-postgres \
--         psql -U worklingo -d worklingo < deploy/schema.sql)
--   4) Seed cấu hình mặc định + user dev:
--        npm run db:seed && npx tsx lib/db/seed-user.ts
--
-- Ghi chú:
--   - File đã kèm dữ liệu drizzle.__drizzle_migrations → về sau thêm
--     migration mới chỉ cần `npm run db:migrate` (không chạy lại từ đầu).
--   - KHÔNG chạy file này lên database đã có bảng (sẽ báo lỗi trùng).
--   - File này là ảnh chụp; nguồn sự thật của schema vẫn là
--     lib/db/schema.ts + thư mục drizzle/. Tái sinh file:
--        npm run db:schema-sql
-- =====================================================================

--
-- PostgreSQL database dump
--


-- Dumped from database version 18.4 (Debian 18.4-1.pgdg13+1)
-- Dumped by pg_dump version 18.4 (Debian 18.4-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA drizzle;


--
-- Name: card_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.card_type AS ENUM (
    'recognition',
    'cloze',
    'production',
    'reading'
);


--
-- Name: confidence; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.confidence AS ENUM (
    'high',
    'medium',
    'low'
);


--
-- Name: role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.role AS ENUM (
    'user',
    'admin'
);


--
-- Name: setting_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.setting_type AS ENUM (
    'string',
    'number',
    'bool',
    'json'
);


--
-- Name: source_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.source_type AS ENUM (
    'chat',
    'meeting',
    'youtube',
    'text'
);


--
-- Name: word_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.word_status AS ENUM (
    'new',
    'learning',
    'known'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: -
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: -
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: -
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts (
    user_id text NOT NULL,
    type text NOT NULL,
    provider text NOT NULL,
    provider_account_id text NOT NULL,
    refresh_token text,
    access_token text,
    expires_at integer,
    token_type text,
    scope text,
    id_token text,
    session_state text
);


--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_settings (
    key text NOT NULL,
    value jsonb NOT NULL,
    type public.setting_type NOT NULL,
    description text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by text
);


--
-- Name: cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    note_id uuid NOT NULL,
    user_id text NOT NULL,
    type public.card_type NOT NULL,
    fsrs_state jsonb,
    suspended boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    sentence_id uuid NOT NULL,
    target_word text NOT NULL,
    reading text NOT NULL,
    meaning text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    card_id uuid NOT NULL,
    rating integer NOT NULL,
    reviewed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sentences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sentences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_id uuid NOT NULL,
    original text NOT NULL,
    text text NOT NULL,
    corrected boolean DEFAULT false NOT NULL,
    note text,
    confidence public.confidence DEFAULT 'high'::public.confidence NOT NULL,
    tokens jsonb DEFAULT '[]'::jsonb NOT NULL,
    skipped boolean DEFAULT false NOT NULL,
    translation text,
    audio_start real
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    session_token text NOT NULL,
    user_id text NOT NULL,
    expires timestamp without time zone NOT NULL
);


--
-- Name: sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    type public.source_type NOT NULL,
    title text NOT NULL,
    raw_content text NOT NULL,
    audio_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_settings (
    user_id text NOT NULL,
    enabled_card_types jsonb DEFAULT '["recognition"]'::jsonb NOT NULL,
    sound_enabled boolean DEFAULT true NOT NULL,
    jlpt_level text
);


--
-- Name: user_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_stats (
    user_id text NOT NULL,
    xp integer DEFAULT 0 NOT NULL,
    streak integer DEFAULT 0 NOT NULL,
    last_studied_date date
);


--
-- Name: user_words; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_words (
    user_id text NOT NULL,
    word text NOT NULL,
    status public.word_status DEFAULT 'new'::public.word_status NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id text NOT NULL,
    name text,
    email text,
    email_verified timestamp without time zone,
    image text,
    role public.role DEFAULT 'user'::public.role NOT NULL,
    password_hash text,
    disabled boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: verification_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification_tokens (
    identifier text NOT NULL,
    token text NOT NULL,
    expires timestamp without time zone NOT NULL
);


--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: accounts accounts_provider_provider_account_id_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_provider_provider_account_id_pk PRIMARY KEY (provider, provider_account_id);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (key);


--
-- Name: cards cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cards
    ADD CONSTRAINT cards_pkey PRIMARY KEY (id);


--
-- Name: notes notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: sentences sentences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sentences
    ADD CONSTRAINT sentences_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (session_token);


--
-- Name: sources sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sources
    ADD CONSTRAINT sources_pkey PRIMARY KEY (id);


--
-- Name: user_settings user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_pkey PRIMARY KEY (user_id);


--
-- Name: user_stats user_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_stats
    ADD CONSTRAINT user_stats_pkey PRIMARY KEY (user_id);


--
-- Name: user_words user_words_user_id_word_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_words
    ADD CONSTRAINT user_words_user_id_word_pk PRIMARY KEY (user_id, word);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: verification_tokens verification_tokens_identifier_token_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_tokens
    ADD CONSTRAINT verification_tokens_identifier_token_pk PRIMARY KEY (identifier, token);


--
-- Name: cards_due_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cards_due_idx ON public.cards USING btree (user_id, suspended, ((fsrs_state ->> 'due'::text)));


--
-- Name: cards_note_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cards_note_id_idx ON public.cards USING btree (note_id);


--
-- Name: notes_sentence_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notes_sentence_id_idx ON public.notes USING btree (sentence_id);


--
-- Name: sentences_source_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sentences_source_id_idx ON public.sentences USING btree (source_id);


--
-- Name: user_words_user_word_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_words_user_word_idx ON public.user_words USING btree (user_id, word);


--
-- Name: accounts accounts_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: app_settings app_settings_updated_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_updated_by_users_id_fk FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: cards cards_note_id_notes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cards
    ADD CONSTRAINT cards_note_id_notes_id_fk FOREIGN KEY (note_id) REFERENCES public.notes(id) ON DELETE CASCADE;


--
-- Name: cards cards_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cards
    ADD CONSTRAINT cards_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notes notes_sentence_id_sentences_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_sentence_id_sentences_id_fk FOREIGN KEY (sentence_id) REFERENCES public.sentences(id) ON DELETE CASCADE;


--
-- Name: notes notes_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_card_id_cards_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_card_id_cards_id_fk FOREIGN KEY (card_id) REFERENCES public.cards(id) ON DELETE CASCADE;


--
-- Name: sentences sentences_source_id_sources_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sentences
    ADD CONSTRAINT sentences_source_id_sources_id_fk FOREIGN KEY (source_id) REFERENCES public.sources(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sources sources_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sources
    ADD CONSTRAINT sources_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_settings user_settings_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_stats user_stats_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_stats
    ADD CONSTRAINT user_stats_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_words user_words_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_words
    ADD CONSTRAINT user_words_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--



-- =====================================================================
-- Sổ migration Drizzle (đánh dấu các migration đã áp dụng)
-- =====================================================================
--
-- PostgreSQL database dump
--


-- Dumped from database version 18.4 (Debian 18.4-1.pgdg13+1)
-- Dumped by pg_dump version 18.4 (Debian 18.4-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: __drizzle_migrations; Type: TABLE DATA; Schema: drizzle; Owner: worklingo
--

INSERT INTO drizzle.__drizzle_migrations VALUES (1, '739113e2b79692a6b35ce2fab705738d3f169daea01d49fce5369ae0ba1e71b4', 1780579957527);
INSERT INTO drizzle.__drizzle_migrations VALUES (2, '71eae2d2d64943937a8ef56f2f39795f894bf07fc1db9d1a19dd7d6c71ecf32d', 1780581818163);


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE SET; Schema: drizzle; Owner: worklingo
--

SELECT pg_catalog.setval('drizzle.__drizzle_migrations_id_seq', 2, true);


--
-- PostgreSQL database dump complete
--


