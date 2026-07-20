package com.academy.platform.attendance;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record OpenAttendanceCorrectionRequest(

        @NotBlank
        @Size(max = 1000)
        String reason
) {
}
