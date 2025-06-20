# Migration de SQL Server vers PostgreSQL avec Liquibase

Ce document détaille le processus de migration de la base de données UMIG depuis SQL Server vers PostgreSQL en utilisant Liquibase comme outil de gestion des changements de schéma.

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Prérequis](#prérequis)
3. [Structure des fichiers](#structure-des-fichiers)
4. [Configuration de Liquibase](#configuration-de-liquibase)
5. [Scripts de migration](#scripts-de-migration)
6. [Exécution de la migration](#exécution-de-la-migration)
7. [Vérification](#vérification)
8. [Résolution des problèmes courants](#résolution-des-problèmes-courants)

## Vue d'ensemble

La migration implique la conversion du schéma SQL Server existant vers un format compatible avec PostgreSQL, en tenant compte des différences de syntaxe, de types de données et de fonctionnalités entre les deux systèmes de gestion de base de données.

### Principales différences à considérer

| Fonctionnalité | SQL Server | PostgreSQL |
|----------------|------------|------------|
| Types de texte | `nvarchar`, `nchar` | `varchar` |
| Dates | `datetime` | `timestamp` |
| Auto-incrémentation | `IDENTITY` | `SERIAL` ou séquences |
| Délimiteurs d'identifiants | Crochets `[]` | Guillemets doubles `""` |
| Booléens | `bit` | `boolean` |
| Texte long | `nvarchar(max)` | `text` |

## Prérequis

1. **Liquibase CLI** installé (version 4.9.0 ou supérieure)
2. **PostgreSQL** (version 13 ou supérieure)
3. **Driver JDBC pour PostgreSQL** (postgresql-42.7.7.jar ou version plus récente)
4. Accès à la base de données PostgreSQL cible

## Structure des fichiers

```
local-dev-setup/liquibase/
├── db.changelog-master.xml                 # Fichier maître qui inclut tous les changelogs
├── changelogs/
│   ├── 001_create_base_tables.sql          # Tables principales
│   ├── 002_create_relationship_tables.sql  # Tables de relations
│   ├── 003_create_foreign_keys.sql         # Contraintes de clés étrangères
│   └── db.changelog-master.xml             # Fichier maître des changelogs
└── liquibase.properties                    # Configuration de Liquibase
```

## Configuration de Liquibase

### Fichier liquibase.properties

Créez ou modifiez le fichier `local-dev-setup/liquibase/liquibase.properties` avec le contenu suivant :

```properties
# Configuration pour PostgreSQL
driver=org.postgresql.Driver
url=jdbc:postgresql://localhost:5432/umig
username=postgres
password=postgres
defaultSchemaName=public
changeLogFile=db.changelog-master.xml
```

Ajustez les valeurs selon votre environnement, notamment l'URL, le nom d'utilisateur et le mot de passe.

### Fichier db.changelog-master.xml (racine)

Créez le fichier `local-dev-setup/liquibase/db.changelog-master.xml` :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
                        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.9.xsd">
    
    <include file="changelogs/db.changelog-master.xml" relativeToChangelogFile="true"/>
</databaseChangeLog>
```

### Fichier changelogs/db.changelog-master.xml

Créez le fichier `local-dev-setup/liquibase/changelogs/db.changelog-master.xml` :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
                        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.9.xsd">
    
    <include file="001_create_base_tables.sql" relativeToChangelogFile="true"/>
    <include file="002_create_relationship_tables.sql" relativeToChangelogFile="true"/>
    <include file="003_create_foreign_keys.sql" relativeToChangelogFile="true"/>
</databaseChangeLog>
```

## Scripts de migration

### 001_create_base_tables.sql

Ce fichier contient les tables principales sans relations :

```sql
--liquibase formatted sql

--changeset author:initial-schema-1 labels:base-tables
-- Tables principales

-- MIGRATIONS_MIG
CREATE TABLE migrations_mig (
    id SERIAL PRIMARY KEY,
    mig_code VARCHAR(10) NOT NULL,
    mig_name VARCHAR(10)
);

-- ENVIRONMENTS_ENV
CREATE TABLE environments_env (
    id SERIAL PRIMARY KEY,
    env_code VARCHAR(50) NOT NULL,
    env_description VARCHAR(50)
);

-- ROLES_RLS
CREATE TABLE roles_rls (
    id SERIAL PRIMARY KEY,
    rls_code VARCHAR(10) NOT NULL,
    rls_name VARCHAR(30) NOT NULL,
    rls_description TEXT
);

-- APPLICATIONS_APP
CREATE TABLE applications_app (
    id SERIAL PRIMARY KEY,
    app_code VARCHAR(50) NOT NULL,
    app_name VARCHAR(10)
);

-- TEAMS_TMS
CREATE TABLE teams_tms (
    id SERIAL PRIMARY KEY,
    tms_code VARCHAR(50) NOT NULL,
    tms_name VARCHAR(64) NOT NULL,
    tms_email VARCHAR(64) NOT NULL
);

-- PHASES_PHS
CREATE TABLE phases_phs (
    id SERIAL PRIMARY KEY,
    phs_code VARCHAR(50) NOT NULL,
    phs_name VARCHAR(50),
    phs_start_date TIMESTAMP,
    phs_duration INTEGER
);

-- STATUS_STS
CREATE TABLE status_sts (
    id SERIAL PRIMARY KEY,
    sts_code VARCHAR(50) NOT NULL,
    sts_name VARCHAR(50)
);

-- USERS_USR
CREATE TABLE users_usr (
    id SERIAL PRIMARY KEY,
    usr_firstname TEXT,
    usr_lastname TEXT,
    usr_email TEXT,
    tms_id INTEGER,
    rle_id INTEGER
);
```

### 002_create_relationship_tables.sql

Ce fichier contient les tables de relation et les tables dépendantes :

```sql
--liquibase formatted sql

--changeset author:initial-schema-2 labels:relationship-tables
-- Tables de relations et tables dépendantes

-- MIGRATIONS_ENVIRONMENTS_MEV
CREATE TABLE migrations_environments_mev (
    id SERIAL PRIMARY KEY,
    mig_id INTEGER NOT NULL,
    env_id INTEGER NOT NULL
);

-- ENVIRONMENTS_APPLICATIONS_EAP
CREATE TABLE environments_applications_eap (
    id SERIAL PRIMARY KEY,
    env_id INTEGER NOT NULL,
    app_id INTEGER NOT NULL
);

-- TEAMS_APPLICATIONS_TAP
CREATE TABLE teams_applications_tap (
    id SERIAL PRIMARY KEY,
    app_id INTEGER,
    tms_id INTEGER
);

-- STEPS_STP
CREATE TABLE steps_stp (
    id SERIAL PRIMARY KEY,
    stp_name VARCHAR(10),
    stp_instruction VARCHAR(10),
    stp_start_date TIMESTAMP,
    stp_end_date DATE,
    tms_id INTEGER,
    usr_id INTEGER,
    phs_id INTEGER,
    stp_previous INTEGER,
    sts_id INTEGER,
    env_id INTEGER,
    its_id INTEGER
);

-- IMPACTED_TEAMS_ITS
CREATE TABLE impacted_teams_its (
    id SERIAL PRIMARY KEY,
    stp_id INTEGER,
    tms_id INTEGER
);

-- ADDITIONAL_INSTRUCTIONS_AIS
CREATE TABLE additional_instructions_ais (
    id INTEGER PRIMARY KEY,
    stp_id INTEGER NOT NULL,
    instructions TEXT
);

-- LOGS_LOG
CREATE TABLE logs_log (
    id SERIAL PRIMARY KEY,
    phs_id INTEGER,
    stp_id INTEGER,
    sts_id INTEGER,
    log_message TEXT
);
```

### 003_create_foreign_keys.sql

Ce fichier contient toutes les contraintes de clés étrangères :

```sql
--liquibase formatted sql

--changeset author:initial-schema-3 labels:foreign-keys
-- Contraintes de clés étrangères

-- MIGRATIONS_ENVIRONMENTS_MEV
ALTER TABLE migrations_environments_mev 
    ADD CONSTRAINT fk_migrations_environments_mev_migrations_mig 
    FOREIGN KEY (mig_id) REFERENCES migrations_mig(id);

ALTER TABLE migrations_environments_mev 
    ADD CONSTRAINT fk_migrations_environments_mev_environments_env 
    FOREIGN KEY (env_id) REFERENCES environments_env(id);

-- ENVIRONMENTS_APPLICATIONS_EAP
ALTER TABLE environments_applications_eap 
    ADD CONSTRAINT fk_environments_applications_eap_environments_env 
    FOREIGN KEY (env_id) REFERENCES environments_env(id);

ALTER TABLE environments_applications_eap 
    ADD CONSTRAINT fk_environments_applications_eap_applications_app 
    FOREIGN KEY (app_id) REFERENCES applications_app(id);

-- TEAMS_APPLICATIONS_TAP
ALTER TABLE teams_applications_tap 
    ADD CONSTRAINT fk_teams_applications_tap_applications_app 
    FOREIGN KEY (app_id) REFERENCES applications_app(id);

ALTER TABLE teams_applications_tap 
    ADD CONSTRAINT fk_teams_applications_tap_teams_tms 
    FOREIGN KEY (tms_id) REFERENCES teams_tms(id);

-- USERS_USR
ALTER TABLE users_usr 
    ADD CONSTRAINT fk_users_usr_teams_tms 
    FOREIGN KEY (tms_id) REFERENCES teams_tms(id);

ALTER TABLE users_usr 
    ADD CONSTRAINT fk_users_usr_roles_rls 
    FOREIGN KEY (rle_id) REFERENCES roles_rls(id);

-- STEPS_STP
ALTER TABLE steps_stp 
    ADD CONSTRAINT fk_steps_stp_teams_tms 
    FOREIGN KEY (tms_id) REFERENCES teams_tms(id);

ALTER TABLE steps_stp 
    ADD CONSTRAINT fk_steps_stp_users_usr 
    FOREIGN KEY (usr_id) REFERENCES users_usr(id);

ALTER TABLE steps_stp 
    ADD CONSTRAINT fk_steps_stp_phases_phs 
    FOREIGN KEY (phs_id) REFERENCES phases_phs(id);

ALTER TABLE steps_stp 
    ADD CONSTRAINT fk_steps_stp_status_sts 
    FOREIGN KEY (sts_id) REFERENCES status_sts(id);

ALTER TABLE steps_stp 
    ADD CONSTRAINT fk_steps_stp_environments_env 
    FOREIGN KEY (env_id) REFERENCES environments_env(id);

-- IMPACTED_TEAMS_ITS
ALTER TABLE impacted_teams_its 
    ADD CONSTRAINT fk_impacted_teams_its_steps_stp 
    FOREIGN KEY (stp_id) REFERENCES steps_stp(id);

ALTER TABLE impacted_teams_its 
    ADD CONSTRAINT fk_impacted_teams_its_teams_tms 
    FOREIGN KEY (tms_id) REFERENCES teams_tms(id);

-- ADDITIONAL_INSTRUCTIONS_AIS
ALTER TABLE additional_instructions_ais 
    ADD CONSTRAINT fk_additional_instructions_ais_steps_stp 
    FOREIGN KEY (stp_id) REFERENCES steps_stp(id);

-- LOGS_LOG
ALTER TABLE logs_log 
    ADD CONSTRAINT fk_logs_log_phases_phs 
    FOREIGN KEY (phs_id) REFERENCES phases_phs(id);

ALTER TABLE logs_log 
    ADD CONSTRAINT fk_logs_log_steps_stp 
    FOREIGN KEY (stp_id) REFERENCES steps_stp(id);

ALTER TABLE logs_log 
    ADD CONSTRAINT fk_logs_log_status_sts 
    FOREIGN KEY (sts_id) REFERENCES status_sts(id);
```

## Exécution de la migration

### Préparation

1. Assurez-vous que PostgreSQL est en cours d'exécution et accessible
2. Créez une base de données vide nommée `umig` dans PostgreSQL :
   ```sql
   CREATE DATABASE umig;
   ```
3. Vérifiez que le fichier `liquibase.properties` est correctement configuré

### Exécution de Liquibase

Depuis le répertoire `local-dev-setup/liquibase`, exécutez les commandes suivantes :

1. Vérifiez la configuration :
   ```bash
   liquibase status
   ```

2. Générez un script SQL (facultatif, pour vérification) :
   ```bash
   liquibase update-sql > migration_script.sql
   ```

3. Exécutez la migration :
   ```bash
   liquibase update
   ```

## Vérification

Après l'exécution de la migration, vérifiez que toutes les tables et contraintes ont été créées correctement :

```sql
-- Vérifier les tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Vérifier les contraintes
SELECT conname, contype, conrelid::regclass AS table_name
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
ORDER BY conrelid::regclass::text, contype, conname;
```

## Résolution des problèmes courants

### Erreurs de type de données

Si vous rencontrez des erreurs liées aux types de données, vérifiez les mappages suivants :

| SQL Server | PostgreSQL | Notes |
|------------|------------|-------|
| `bit` | `boolean` | `0` devient `false`, `1` devient `true` |
| `datetime` | `timestamp` | Format ISO recommandé |
| `nvarchar(max)` | `text` | Pas de limite de taille en PostgreSQL |
| `uniqueidentifier` | `uuid` | Utilisez les fonctions UUID de PostgreSQL |

### Erreurs de séquence

Si les séquences pour les colonnes `SERIAL` ne sont pas correctement créées :

```sql
-- Créer une séquence manuellement
CREATE SEQUENCE table_name_id_seq;

-- Associer la séquence à la colonne
ALTER TABLE table_name ALTER COLUMN id SET DEFAULT nextval('table_name_id_seq');
ALTER SEQUENCE table_name_id_seq OWNED BY table_name.id;
```

### Problèmes de contraintes

Si les contraintes de clé étrangère échouent, vérifiez l'ordre de création des tables et assurez-vous que les tables référencées sont créées avant les tables qui les référencent.

---

## Intégration avec l'environnement local UMIG

Cette migration s'intègre parfaitement avec l'environnement de développement local UMIG existant, qui utilise déjà Liquibase pour la gestion des schémas de base de données. Les scripts de migration peuvent être exécutés dans le cadre du processus de démarrage normal via `start.sh`.

Pour plus d'informations sur l'environnement local, consultez `local-dev-setup/README.md`.
