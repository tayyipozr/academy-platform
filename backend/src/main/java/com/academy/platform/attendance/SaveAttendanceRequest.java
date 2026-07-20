package com.academy.platform.attendance;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

public record SaveAttendanceRequest(

        @NotEmpty
        List<@Valid AttendanceRecordRequest> records
) {
    public SaveAttendanceRequest {
        records = records == null
                ? List.of()
                : List.copyOf(records);
    }
}
