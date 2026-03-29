package com.kafkamind.streaming;

import lombok.Data;
import java.util.concurrent.atomic.AtomicLong;

@Data
public class PipelineMetrics {
    private final AtomicLong transferred = new AtomicLong(0);
    private final AtomicLong filtered    = new AtomicLong(0);
    private final AtomicLong errors      = new AtomicLong(0);
    private volatile long    throughput  = 0; // msg/s
    private volatile long    lag         = 0;
    private volatile String  lastError   = null;
    private volatile long    lastMessageTs = 0;

    private long lastCount = 0;
    private long lastTime  = System.currentTimeMillis();

    public void updateThroughput() {
        long now   = System.currentTimeMillis();
        long count = transferred.get();
        long dt    = now - lastTime;
        if (dt > 0) throughput = (count - lastCount) * 1000 / dt;
        lastCount = count;
        lastTime  = now;
    }
}
