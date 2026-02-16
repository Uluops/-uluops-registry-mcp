-- MySQL dump 10.13  Distrib 8.0.45, for Linux (x86_64)
--
-- Host: localhost    Database: uluops_registry
-- ------------------------------------------------------
-- Server version	8.0.45-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `definition_executions`
--

DROP TABLE IF EXISTS `definition_executions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `definition_executions` (
  `id` binary(16) NOT NULL,
  `definition_id` binary(16) NOT NULL,
  `run_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unknown',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_executions_run_id` (`run_id`),
  KEY `idx_executions_rate_limit` (`definition_id`,`created_at`),
  KEY `idx_executions_source` (`source`,`created_at`),
  CONSTRAINT `fk_executions_definition` FOREIGN KEY (`definition_id`) REFERENCES `definitions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `definition_forks`
--

DROP TABLE IF EXISTS `definition_forks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `definition_forks` (
  `id` binary(16) NOT NULL,
  `definition_id` binary(16) NOT NULL,
  `source_definition_id` binary(16) NOT NULL,
  `forked_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_forks_definition` (`definition_id`),
  KEY `idx_forks_source` (`source_definition_id`),
  CONSTRAINT `fk_forks_definition` FOREIGN KEY (`definition_id`) REFERENCES `definitions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_forks_source` FOREIGN KEY (`source_definition_id`) REFERENCES `definitions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `definition_languages`
--

DROP TABLE IF EXISTS `definition_languages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `definition_languages` (
  `id` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Language identifier: adl, cdl, wdl, pdl',
  `display_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Human-readable name, e.g. Agent Definition Language',
  `abbreviation` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Uppercase abbreviation: ADL, CDL, WDL, PDL',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Purpose and scope of this language',
  `definition_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Corresponding definitions.type value: agent, command, workflow, pipeline',
  `schema_url_prefix` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '$id URL prefix, e.g. https://uluops.ai/schemas/adl',
  `root_key` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Top-level JSON key in definitions: agent, command, workflow, pipeline',
  `current_version` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Latest active schema version (denormalized for fast lookup)',
  `hierarchy_order` tinyint unsigned NOT NULL COMMENT 'Position in composition hierarchy: 1=agent, 2=command, 3=workflow, 4=pipeline',
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active' COMMENT 'active, deprecated, experimental',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_deflang_deftype` (`definition_type`),
  UNIQUE KEY `uk_deflang_abbrev` (`abbreviation`),
  UNIQUE KEY `uk_deflang_order` (`hierarchy_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Definition language types (ADL, CDL, WDL, PDL)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `definition_references`
--

DROP TABLE IF EXISTS `definition_references`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `definition_references` (
  `id` binary(16) NOT NULL,
  `from_definition_id` binary(16) NOT NULL,
  `to_definition_id` binary(16) NOT NULL,
  `context` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_defrefs_from_to_context` (`from_definition_id`,`to_definition_id`,`context`),
  KEY `idx_defrefs_from` (`from_definition_id`),
  KEY `idx_defrefs_to` (`to_definition_id`),
  CONSTRAINT `fk_defrefs_from` FOREIGN KEY (`from_definition_id`) REFERENCES `definitions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_defrefs_to` FOREIGN KEY (`to_definition_id`) REFERENCES `definitions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `definition_schemas`
--

DROP TABLE IF EXISTS `definition_schemas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `definition_schemas` (
  `id` binary(16) NOT NULL COMMENT 'UUID primary key',
  `language_id` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'FK to definition_languages.id',
  `version` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'SemVer version string, e.g. 1.6.0',
  `json_schema` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Complete JSON Schema document (immutable after insert)',
  `hash` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'SHA-256 of json_schema content for integrity verification',
  `schema_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Full $id URL, e.g. https://uluops.ai/schemas/adl/v1.6.0/agent.json',
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Schema title from the JSON Schema document',
  `parent_version` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Previous version this was derived from (NULL for initial versions)',
  `change_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'breaking, additive, cosmetic, initial',
  `change_summary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Human-readable description of what changed',
  `compatibility_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Notes on backward/forward compatibility with parent version',
  `definition_count` int unsigned NOT NULL DEFAULT '0' COMMENT 'Number of definitions validated against this schema version',
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active' COMMENT 'active, deprecated, superseded',
  `deprecated_at` datetime DEFAULT NULL COMMENT 'When this schema version was deprecated',
  `superseded_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Version that supersedes this one',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'system' COMMENT 'Who published this schema version',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_defschema_lang_version` (`language_id`,`version`),
  KEY `idx_defschema_language` (`language_id`),
  KEY `idx_defschema_status` (`status`),
  KEY `idx_defschema_hash` (`hash`),
  CONSTRAINT `fk_defschema_language` FOREIGN KEY (`language_id`) REFERENCES `definition_languages` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Immutable versioned JSON Schema documents for definition languages';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `definition_versions`
--

DROP TABLE IF EXISTS `definition_versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `definition_versions` (
  `id` binary(16) NOT NULL,
  `definition_id` binary(16) NOT NULL,
  `version` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `yaml` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `hash` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `runtime_md` mediumtext COLLATE utf8mb4_unicode_ci,
  `translator_version` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `schema_version` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `change_summary` text COLLATE utf8mb4_unicode_ci,
  `change_type` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_defversions_def_version` (`definition_id`,`version`),
  KEY `idx_defversions_definition` (`definition_id`),
  KEY `idx_defversions_created_by` (`created_by`),
  CONSTRAINT `fk_defversions_definition` FOREIGN KEY (`definition_id`) REFERENCES `definitions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `definitions`
--

DROP TABLE IF EXISTS `definitions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `definitions` (
  `id` binary(16) NOT NULL,
  `type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `version` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `yaml` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `hash` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `domain` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subdomain` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `agent_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `display_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `author` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `published_at` datetime DEFAULT NULL,
  `deprecated_at` datetime DEFAULT NULL,
  `owner_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ulu',
  `tier` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user',
  `visibility` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'private',
  `runtime_md` mediumtext COLLATE utf8mb4_unicode_ci,
  `translator_version` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `schema_version` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `execution_count` int unsigned NOT NULL DEFAULT '0',
  `fork_count` int unsigned NOT NULL DEFAULT '0',
  `star_count` int unsigned NOT NULL DEFAULT '0',
  `forked_from_id` binary(16) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_definitions_type_name_version` (`type`,`name`,`version`),
  KEY `idx_definitions_type` (`type`),
  KEY `idx_definitions_status` (`status`),
  KEY `idx_definitions_domain` (`domain`),
  KEY `idx_definitions_owner` (`owner_id`),
  KEY `idx_definitions_tier` (`tier`),
  KEY `idx_definitions_visibility` (`visibility`),
  KEY `idx_definitions_owner_visibility` (`owner_id`,`visibility`),
  KEY `idx_definitions_forked_from` (`forked_from_id`),
  CONSTRAINT `fk_definitions_forked_from` FOREIGN KEY (`forked_from_id`) REFERENCES `definitions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `knex_migrations`
--

DROP TABLE IF EXISTS `knex_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `knex_migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `batch` int DEFAULT NULL,
  `migration_time` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `knex_migrations_lock`
--

DROP TABLE IF EXISTS `knex_migrations_lock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `knex_migrations_lock` (
  `index` int unsigned NOT NULL AUTO_INCREMENT,
  `is_locked` int DEFAULT NULL,
  PRIMARY KEY (`index`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `model_aliases`
--

DROP TABLE IF EXISTS `model_aliases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `model_aliases` (
  `alias` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_provider` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_model_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `scope` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'global',
  `deprecated` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`alias`),
  KEY `idx_aliases_target` (`target_provider`,`target_model_id`),
  CONSTRAINT `fk_aliases_target` FOREIGN KEY (`target_provider`, `target_model_id`) REFERENCES `models` (`provider`, `model_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `models`
--

DROP TABLE IF EXISTS `models`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `models` (
  `provider` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `model_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `logo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `provider_model_id` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `capabilities` json NOT NULL,
  `modalities` json DEFAULT NULL,
  `tier` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'available',
  `family` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cost_input` decimal(10,6) DEFAULT NULL,
  `cost_output` decimal(10,6) DEFAULT NULL,
  `cost_cache_read` decimal(10,6) DEFAULT NULL,
  `cost_cache_write` decimal(10,6) DEFAULT NULL,
  `context_limit` int unsigned DEFAULT NULL,
  `output_limit` int unsigned DEFAULT NULL,
  `regions` json DEFAULT NULL,
  `release_date` date DEFAULT NULL,
  `deprecation_date` date DEFAULT NULL,
  `successor` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `knowledge_cutoff` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `open_weights` tinyint(1) NOT NULL DEFAULT '0',
  `synced_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`provider`,`model_id`),
  KEY `idx_models_provider` (`provider`),
  KEY `idx_models_tier` (`tier`),
  KEY `idx_models_status` (`status`),
  CONSTRAINT `fk_models_provider` FOREIGN KEY (`provider`) REFERENCES `providers` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `providers`
--

DROP TABLE IF EXISTS `providers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `providers` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `website` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `doc_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `api_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `schema_version`
--

DROP TABLE IF EXISTS `schema_version`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schema_version` (
  `version` int NOT NULL,
  `applied_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-15 19:34:46
