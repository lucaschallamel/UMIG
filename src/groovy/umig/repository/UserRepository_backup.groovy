    /**
     * Retrieves paginated users from the database with optional search and sorting.
     * @param pageNumber The page number (1-based).
     * @param pageSize The number of users per page.
     * @param searchTerm Optional search term to filter users.
     * @param sortField Optional field to sort by.
     * @param sortDirection Sort direction ('asc' or 'desc').
     * @return A map containing users list and pagination metadata.
     */
    def findAllUsers(int pageNumber, int pageSize, String searchTerm = null, String sortField = null, String sortDirection = 'asc') {
        DatabaseUtil.withSql { sql ->
            // Build basic query parts
            def whereClause = ""
            def orderClause = "ORDER BY usr_id ASC"
            def params = [pageSize: pageSize, offset: (pageNumber - 1) * pageSize]
            
            // Add search if provided
            if (searchTerm && !searchTerm.trim().isEmpty()) {
                whereClause = """
                    WHERE (usr_first_name ILIKE :searchTerm 
                           OR usr_last_name ILIKE :searchTerm 
                           OR usr_email ILIKE :searchTerm 
                           OR usr_code ILIKE :searchTerm)
                """
                params.searchTerm = "%${searchTerm.trim()}%"
            }
            
            // Add sorting if provided
            if (sortField) {
                def validSortFields = ['usr_id', 'usr_code', 'usr_first_name', 'usr_last_name', 'usr_email', 'usr_is_admin', 'usr_active', 'rls_id']
                if (validSortFields.contains(sortField)) {
                    def direction = (sortDirection?.toLowerCase() == 'desc') ? 'DESC' : 'ASC'
                    orderClause = "ORDER BY ${sortField} ${direction}"
                }
            }
            
            // Get total count
            def countQuery = "SELECT COUNT(*) as total FROM users_usr ${whereClause}"
            def countParams = [:]
            if (searchTerm && !searchTerm.trim().isEmpty()) {
                countParams.searchTerm = "%${searchTerm.trim()}%"
            }
            def totalCount = sql.firstRow(countQuery, countParams).total as long
            
            // Get paginated users
            def usersQuery = """
                SELECT usr_id, usr_code, usr_first_name, usr_last_name, usr_email, usr_is_admin, usr_active, rls_id
                FROM users_usr
                ${whereClause}
                ${orderClause}
                LIMIT :pageSize OFFSET :offset
            """
            
            def users = sql.rows(usersQuery, params)
            
            // Attach teams for each user
            users.each { user ->
                user.teams = sql.rows("""
                    SELECT t.tms_id, t.tms_name, t.tms_description, t.tms_email
                    FROM teams_tms_x_users_usr j
                    JOIN teams_tms t ON t.tms_id = j.tms_id
                    WHERE j.usr_id = :userId
                """, [userId: user.usr_id])
            }
            
            def totalPages = (totalCount + pageSize - 1) / pageSize as int
            
            return [
                content: users,
                totalElements: totalCount,
                totalPages: totalPages,
                pageNumber: pageNumber,
                pageSize: pageSize,
                hasNext: pageNumber < totalPages,
                hasPrevious: pageNumber > 1,
                sortField: sortField,
                sortDirection: sortDirection
            ]
        }
    }