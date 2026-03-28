package com.kafkamind.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Plan plan = Plan.FREE;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum Plan {
        FREE, PRO, ENTERPRISE;

        public int monthlyLimit() {
            return switch (this) {
                case FREE       -> 50;
                case PRO        -> 500;
                case ENTERPRISE -> Integer.MAX_VALUE;
            };
        }
    }
}
