package com.applyflow.system;

import io.swagger.v3.oas.annotations.media.Schema;

public record SystemStatus(
        @Schema(example = "ok") String status,
        @Schema(example = "0.1.0") String version,
        @Schema(example = "connected") String database) {
}
