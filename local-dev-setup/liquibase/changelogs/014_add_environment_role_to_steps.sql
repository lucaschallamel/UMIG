--liquibase formatted sql

--changeset lucas.challamel:014-add-environment-role-to-steps-master
--comment: Add environment role association to steps_master_stm table
ALTER TABLE steps_master_stm 
ADD COLUMN enr_id INTEGER;

--rollback ALTER TABLE steps_master_stm DROP COLUMN enr_id;

--changeset lucas.challamel:014-add-environment-role-to-steps-instance
--comment: Add environment role association to steps_instance_sti table
ALTER TABLE steps_instance_sti 
ADD COLUMN enr_id INTEGER;

--rollback ALTER TABLE steps_instance_sti DROP COLUMN enr_id;

--changeset lucas.challamel:014-add-foreign-key-constraints-environment-roles-steps
--comment: Add foreign key constraints for environment roles in steps tables
ALTER TABLE steps_master_stm 
ADD CONSTRAINT fk_steps_master_stm_environment_roles_enr 
FOREIGN KEY (enr_id) REFERENCES environment_roles_enr(enr_id);

ALTER TABLE steps_instance_sti 
ADD CONSTRAINT fk_steps_instance_sti_environment_roles_enr 
FOREIGN KEY (enr_id) REFERENCES environment_roles_enr(enr_id);

--rollback ALTER TABLE steps_instance_sti DROP CONSTRAINT fk_steps_instance_sti_environment_roles_enr;
--rollback ALTER TABLE steps_master_stm DROP CONSTRAINT fk_steps_master_stm_environment_roles_enr;

--changeset lucas.challamel:014-add-indexes-environment-roles-steps
--comment: Add indexes for environment role lookups in steps tables
CREATE INDEX idx_steps_master_stm_enr_id ON steps_master_stm(enr_id);
CREATE INDEX idx_steps_instance_sti_enr_id ON steps_instance_sti(enr_id);

--rollback DROP INDEX idx_steps_instance_sti_enr_id;
--rollback DROP INDEX idx_steps_master_stm_enr_id;