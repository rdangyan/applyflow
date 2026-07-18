package com.applyflow.system;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

@Service
public class SystemStatusService {
    private final JdbcClient jdbcClient;

    public SystemStatusService(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public SystemStatus getStatus() {
        String version = jdbcClient.sql("select metadata_value from platform_metadata where metadata_key = 'schema_version'")
                .query(String.class)
                .single();
        return new SystemStatus("ok", version, "connected");
    }
}
