package com.academy.platform.authentication;

public record CsrfResponse(
        String headerName,
        String parameterName,
        String token
) {
}
