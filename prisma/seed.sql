--
-- PostgreSQL database dump
--

-- Dumped from database version 14.15 (Ubuntu 14.15-0ubuntu0.22.04.1)
-- Dumped by pg_dump version 14.15 (Ubuntu 14.15-0ubuntu0.22.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: Users; Type: SCHEMA; Schema: -; Owner: testuser
--

CREATE SCHEMA "Users";


ALTER SCHEMA "Users" OWNER TO testuser;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: testuser
--

CREATE TYPE public."Role" AS ENUM (
    'USER',
    'ADMIN',
    'SUPERADMIN',
    'CUSTOMER',
    'VENDOR'
);


ALTER TYPE public."Role" OWNER TO testuser;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Invoice; Type: TABLE; Schema: public; Owner: testuser
--

CREATE TABLE public."Invoice" (
    id text NOT NULL,
    title character varying(20) NOT NULL,
    content text,
    paid boolean DEFAULT false NOT NULL,
    "orderId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Invoice" OWNER TO testuser;

--
-- Name: Log; Type: TABLE; Schema: public; Owner: testuser
--

CREATE TABLE public."Log" (
    id text NOT NULL,
    level text DEFAULT 'debug'::text NOT NULL,
    message text NOT NULL,
    "timestamp" text DEFAULT '---'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Log" OWNER TO testuser;

--
-- Name: Order; Type: TABLE; Schema: public; Owner: testuser
--

CREATE TABLE public."Order" (
    "orderId" text NOT NULL,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deliveryDate" date,
    "vendorId" text NOT NULL,
    status text DEFAULT 'Pending'::text NOT NULL,
    "productsRefs" text[]
);


ALTER TABLE public."Order" OWNER TO testuser;

--
-- Name: Product; Type: TABLE; Schema: public; Owner: testuser
--

CREATE TABLE public."Product" (
    id text NOT NULL,
    reference text NOT NULL,
    title text,
    description text,
    price double precision DEFAULT 1 NOT NULL,
    "inStock" boolean DEFAULT true NOT NULL,
    "vendorId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    activated boolean DEFAULT true NOT NULL
);


ALTER TABLE public."Product" OWNER TO testuser;

--
-- Name: User; Type: TABLE; Schema: public; Owner: testuser
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    name text,
    password text NOT NULL,
    token text,
    role public."Role" DEFAULT 'USER'::public."Role" NOT NULL,
    activated boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO testuser;

--
-- Name: Vendor; Type: TABLE; Schema: public; Owner: testuser
--

CREATE TABLE public."Vendor" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    phone text,
    address text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    activated boolean DEFAULT true NOT NULL,
    "ownerId" text NOT NULL
);


ALTER TABLE public."Vendor" OWNER TO testuser;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: testuser
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO testuser;

--
-- Data for Name: Invoice; Type: TABLE DATA; Schema: public; Owner: testuser
--

COPY public."Invoice" (id, title, content, paid, "orderId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Log; Type: TABLE DATA; Schema: public; Owner: testuser
--

COPY public."Log" (id, level, message, "timestamp", "createdAt") FROM stdin;
cmb8w1su00000bo3xw8dic1yo	debug	This is a log test.	2025-04-14T19:03:32.684Z	2025-05-29 04:42:56.945
cmb8w6gwr0000borbubtxdmal	debug	This is a log test.	2025-05-29T04:46:33.360Z	2025-05-29 04:46:34.78
cmb8wdhjm0000bo09qauxqsoo	debug	This is a log test.	2025-05-29T04:52:00.684Z	2025-05-29 04:52:02.194
\.


--
-- Data for Name: Order; Type: TABLE DATA; Schema: public; Owner: testuser
--

COPY public."Order" ("orderId", "userId", "createdAt", "updatedAt", "deliveryDate", "vendorId", status, "productsRefs") FROM stdin;
cmb2ysrya0003boozxmvvsgpr	cmac659qe0000boxf56hkw9l0	2025-05-25 01:13:17.698	2025-05-25 01:13:17.698	\N	cmb1hmamv0001bo5ct072sl21	Pending	{SNC-00001}
cmb2ysrya0002boozatu9fqf4	cmac659qe0000boxf56hkw9l0	2025-05-25 01:13:17.698	2025-05-25 01:13:17.698	2025-05-15	cmb2t87do0002bo1ioizvpj04	waiting	{NTD-001989}
\.


--
-- Data for Name: Product; Type: TABLE DATA; Schema: public; Owner: testuser
--

COPY public."Product" (id, reference, title, description, price, "inStock", "vendorId", "createdAt", "updatedAt", activated) FROM stdin;
cmb1im12a0003bo6ebmco9b0k	SNC-00001	Sonic the hedgehog	Sonic CD game	29	t	cmb1hmamv0001bo5ct072sl21	2025-05-24 00:52:22.88	2025-05-24 00:52:22.88	t
cmb1ioshy0005bo6e52v3j24v	SNC-00234	Wave Racing	Surfu Gamu	39	t	cmb1hmamv0001bo5ct072sl21	2025-05-24 00:54:31.628	2025-05-24 00:54:31.628	t
cmb1itw7f0007bo6ephqgccl3	SNC-00989	Worms - Special Edition	Fighting game anniversary	40.2	t	cmb1hmamv0001bo5ct072sl21	2025-05-24 00:58:29.833	2025-05-24 00:58:29.833	t
cmb2tbx460004bo1i74et0ysi	NTD-001992	Zelda - Awakening	Ephemeria paradise quest	59.99	t	cmb2t87do0002bo1ioizvpj04	2025-05-24 22:40:13.156	2025-05-24 22:40:13.156	t
cmb2td0x20006bo1ij2iufcup	NTD-001989	Mario bros. 1	Youhouuh brothers	30.99	t	cmb2t87do0002bo1ioizvpj04	2025-05-24 22:41:04.613	2025-05-24 22:41:04.613	t
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: testuser
--

COPY public."User" (id, email, name, password, token, role, activated, "createdAt", "updatedAt") FROM stdin;
cmb1ch9lk0001booxg3tglr34	admin@admin.admin		scrypt$16384$8$1$IgYzw8f86RSiTB7i+PwZpQ==$iN1anddFAkZLZq3iqUrAyZy3SgksGPvYdw/Mm1mOZB/dTcwJrgI8/Rnss/m6mAWyK5WqZNbfFHiRqgMgKsiUNQ==	\N	ADMIN	t	2025-05-23 22:00:42.966	2025-05-23 22:00:42.966
cmb17hi900000boo0ap5q1yn4	sega@company.com	SEGA	scrypt$16384$8$1$m8+udq54YNAyoTaiaChHpw==$5fKE3IhGFlkwrxp21yBrkbJ5QFXiG80gEADaaLnAzlzR04QIs9+OH3X3cPr1gSNQucxuVTjuDJvsAMb+BRjaXA==	\N	VENDOR	t	2025-05-23 19:40:55.92	2025-05-23 19:40:55.92
cmb2t6bk60000bo1ipiwbsepn	nin@nin.nin		scrypt$16384$8$1$pL6xnNPuFdOiSvpsfqKGWA==$83m8cgWHCZIv4Goi8BQmLr99+I/NceGtJ73S4MW9ZcgLjiOaGcuXhFvpCC+ZP2Z62uD40jPmFG85U6LniZ+H1A==	\N	VENDOR	t	2025-05-24 22:35:51.939	2025-05-24 22:35:51.939
cmb17m7rk0001boo02vvvgrz9	mei@mei.mei	Mei	scrypt$16384$8$1$5lvCSKThYiNZhGYHt6IAsQ==$ckuCjUjRmbvcj0qUpp1QWDMYnwkauu1E1z770DtiCrT5aErXZWoUX5Hbpj4vzDG+Mx5CyvVfPizrON58BsHPLQ==	\N	USER	t	2025-05-23 19:44:35.79	2025-05-23 19:44:35.79
cmac659qe0000boxf56hkw9l0	username@user.com	Username	scrypt$16384$8$1$/yYhJfK36wsYzM+aAGvX5g==$W5bjUkXvtoMmb9nLV91IOURWZ8BwnCtL7BrWVoVQtpAPP5c4l7iP6rEpTFc8qMidZhZeFWRa5vJ0tNIUslVGNQ==	\N	CUSTOMER	t	2025-05-06 07:09:11.173	2025-05-06 07:09:11.173
cmb8x8jcz0000boq40ngpcg5m	testuservendor@test.com	\N	scrypt$16384$8$1$bIzzrEICNl0xxPjCLqNtJw==$jaT/N5dh5omG0yud0R8qahMzfkwsOKUN9jYbaXxup0otAIysqExaB9h6jatWLkJw2AGYS42edCte+vsZacbhqA==	\N	VENDOR	t	2025-05-29 05:16:10.883	2025-05-29 05:16:10.883
cmb1cga2c0000booxrcdsvgkk	bowser@big.n		scrypt$16384$8$1$3c+9cyUHgi0+TJdW7t6Jyw==$QHNBeSApL3jcH5cDLttYFUfNaoG5+aUcOaQ+TVf0yZeJPWLzdZ2oHfg5Md16+2wt2oQzGQ5/Uz6w7gY1M1K9Bg==	\N	SUPERADMIN	t	2025-05-23 21:59:56.799	2025-05-23 21:59:56.799
\.


--
-- Data for Name: Vendor; Type: TABLE DATA; Schema: public; Owner: testuser
--

COPY public."Vendor" (id, name, description, phone, address, "createdAt", "updatedAt", activated, "ownerId") FROM stdin;
cmb1hmamv0001bo5ct072sl21	SEGA	Sega company	992-667-9504 x309	84237 Weber Keys	2025-05-24 00:24:35.671	2025-05-24 00:24:35.671	t	cmb17hi900000boo0ap5q1yn4
cmb2t87do0002bo1ioizvpj04	NINTENDO	Nintendo company	395.467.8288	19258 Grace Trace	2025-05-24 22:37:19.836	2025-05-24 22:37:19.836	t	cmb2t6bk60000bo1ipiwbsepn
cmb8x8jdp0002boq42g8s2ye2	vendorName				2025-05-29 05:16:10.909	2025-05-29 05:16:10.909	t	cmb8x8jcz0000boq40ngpcg5m
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: testuser
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
5183d3c3-5f42-4f9f-83d4-7ee4259d98e1	40138745d09349f1b400044b06fc39b7b12d79e4d4696505d20c190a6ec96e37	2025-05-06 02:55:22.82046-04	20250506065521_init	\N	\N	2025-05-06 02:55:22.670127-04	1
\.


--
-- Name: Invoice Invoice_pkey; Type: CONSTRAINT; Schema: public; Owner: testuser
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_pkey" PRIMARY KEY (id);


--
-- Name: Log Log_pkey; Type: CONSTRAINT; Schema: public; Owner: testuser
--

ALTER TABLE ONLY public."Log"
    ADD CONSTRAINT "Log_pkey" PRIMARY KEY (id);


--
-- Name: Order Order_pkey; Type: CONSTRAINT; Schema: public; Owner: testuser
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_pkey" PRIMARY KEY ("orderId");


--
-- Name: Product Product_pkey; Type: CONSTRAINT; Schema: public; Owner: testuser
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: testuser
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Vendor Vendor_pkey; Type: CONSTRAINT; Schema: public; Owner: testuser
--

ALTER TABLE ONLY public."Vendor"
    ADD CONSTRAINT "Vendor_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: testuser
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Invoice_orderId_key; Type: INDEX; Schema: public; Owner: testuser
--

CREATE UNIQUE INDEX "Invoice_orderId_key" ON public."Invoice" USING btree ("orderId");


--
-- Name: Product_reference_key; Type: INDEX; Schema: public; Owner: testuser
--

CREATE UNIQUE INDEX "Product_reference_key" ON public."Product" USING btree (reference);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: testuser
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: Vendor_name_key; Type: INDEX; Schema: public; Owner: testuser
--

CREATE UNIQUE INDEX "Vendor_name_key" ON public."Vendor" USING btree (name);


--
-- Name: Invoice Invoice_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: testuser
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"("orderId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Order Order_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: testuser
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Order Order_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: testuser
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public."Vendor"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Product Product_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: testuser
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public."Vendor"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Vendor Vendor_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: testuser
--

ALTER TABLE ONLY public."Vendor"
    ADD CONSTRAINT "Vendor_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SCHEMA "Users"; Type: ACL; Schema: -; Owner: testuser
--

REVOKE ALL ON SCHEMA "Users" FROM testuser;
GRANT ALL ON SCHEMA "Users" TO testuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: Users; Owner: testuser
--

ALTER DEFAULT PRIVILEGES FOR ROLE testuser IN SCHEMA "Users" GRANT ALL ON TABLES  TO testuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

