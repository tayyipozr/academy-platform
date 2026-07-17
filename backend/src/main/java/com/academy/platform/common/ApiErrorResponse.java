package com.academy.platform.common;

import java.time.Instant;
import java.util.List;

public record ApiErrorResponse(
        String code,
        String message,
        List<FieldErrorResponse> fieldErrors,
        Instant timestamp
) {

    public record FieldErrorResponse(
            String field,
            String message
    ) {
    }
}
