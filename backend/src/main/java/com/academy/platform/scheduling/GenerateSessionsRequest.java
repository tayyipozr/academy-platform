package com.academy.platform.scheduling;

import java.time.LocalDate;

import jakarta.validation.constraints.NotNull;

public record GenerateSessionsRequest(

        @NotNull
        LocalDate dateFrom,

        @NotNull
        LocalDate dateTo
) {
}
