# Repository Coding Patterns (UMIG)

This folder contains all Groovy classes that encapsulate database access logic using the repository pattern.

## Why Use the Repository Pattern?
- **Separation of Concerns:** Keeps SQL/data logic out of API/macro scripts ([CA]).
- **Testability:** Makes it easy to mock DB operations in tests ([TDT]).
- **Reusability:** Centralizes queries for each entity/table ([DRY]).

## How to Create/Use a Repository
- Name the class after the entity/table (e.g., `UserRepository.groovy`).
- Expose static methods for CRUD/query operations.
- Use ScriptRunner's `DatabaseUtil.withSql` for DB connections (see ADR-010).

## Example
```groovy
// umig/repository/UserRepository.groovy
class UserRepository {
    static List<Map> findAllUsers() {
        DatabaseUtil.withSql('umig_app_db_pool') { sql ->
            sql.rows('SELECT * FROM users_usr')
        }
    }
}
```

## References
- See project rules for repository pattern and DB access standards.
- See ADR-010 (DB connection pooling), ADR-011 (endpoint config), ADR-012 (DB management).
