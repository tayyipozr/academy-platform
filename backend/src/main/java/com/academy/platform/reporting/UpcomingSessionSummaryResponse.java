package com.academy.platform.reporting;

import java.time.OffsetDateTime;
import java.util.UUID;

public record UpcomingSessionSummaryResponse(
        UUID sessionId,
        UUID groupId,
        String groupCode,
        String groupName,
        String title,
        OffsetDateTime scheduledStart,
        OffsetDateTime scheduledEnd,
        String location,
        String status,
        UUID leadStaffId,
        String leadStaffName
) {
}
