package com.academy.platform.identity;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AcceptUserInvitationRequest(

        @NotBlank
        String token,

        @Size(min = 12, max = 100)
        String password
) {
}
