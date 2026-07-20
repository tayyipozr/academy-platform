package com.academy.platform.attendance;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record AttendanceCorrectionResponse(
        UUID id,
        UUID sessionId,
        AttendanceCorrectionStatus status,
        String correctionReason,
        OffsetDateTime previousFinalizedAt,
        UUID previousFinalizedBy,
        UUID openedBy,
        String openedByName,
        OffsetDateTime openedAt,
        UUID completedBy,
        String completedByName,
        OffsetDateTime completedAt,
        int changeCount,
        List<AttendanceChangeResponse> changes
) {
    public AttendanceCorrectionResponse {
        changes = List.copyOf(changes);
    }
}
