-- Find users who have at least 7 days in a week with activeEnergyBurned >= 500, year-week basis
-- Initial query to identify candidate weeks
SELECT
    userId,
    MIN(dateComponents) as firstDay,
    MAX(dateComponents) as lastDay,
    YEARWEEK(dateComponents, 1) AS yearWeek,
    SUM(activeEnergyBurned) AS totalCalories,
    AVG(activeEnergyBurned) AS avgCalories,
    MIN(activeEnergyBurned) AS minCalories,
    MAX(activeEnergyBurned) AS maxCalories,
    COUNT(*) AS activeDays
FROM activity_summaries
WHERE activeEnergyBurned >= 500
GROUP BY userId, yearWeek
HAVING COUNT(*) >= 7 AND AVG(activeEnergyBurned) >= 500
ORDER BY userId, yearWeek;

-- Gathering dispersed 7-day achievements the target enery burned up to 500 kcal
-- Final query to find all 7-day streaks
SELECT
    userId,
    MIN(dateComponents) AS firstDate,
    MAX(dateComponents) AS lastDate,
    DATEDIFF(MAX(dateComponents), MIN(dateComponents)) + 1 AS diffDays,
    SUM(activeEnergyBurned) AS totalCalories,
    COUNT(*) AS daysCount
FROM (
    SELECT
        userId,
        dateComponents,
        activeEnergyBurned,
        @rn := IF(@prevUser = userId, @rn + 1, 1) AS rn,
        @prevUser := userId
    FROM activity_summaries
    CROSS JOIN (SELECT @rn := 0, @prevUser := NULL) vars
    WHERE activeEnergyBurned >= 500 -- AND userId='0052fd53-6489-44e1-883b-0d467a589ebc'
    ORDER BY userId, dateComponents
) t
GROUP BY userId, FLOOR((rn-1)/7)
HAVING COUNT(*) = 7
ORDER BY diffDays DESC;

SELECT 
    CASE DAYOFWEEK(dateComponents)
        WHEN 1 THEN 'Sunday'
        WHEN 2 THEN 'Monday'
        WHEN 3 THEN 'Tuesday'
        WHEN 4 THEN 'Wednesday'
        WHEN 5 THEN 'Thursday'
        WHEN 6 THEN 'Friday'
        WHEN 7 THEN 'Saturday'
    END AS day_of_week,
    ROUND(AVG(activeEnergyBurned)) AS avg_active_energy,
    ROUND(STDDEV_POP(activeEnergyBurned)) AS stddev_active_energy,
    ROUND(COUNT(activeEnergyBurned)) AS count_active_energy,
    ROUND(MIN(activeEnergyBurned)) AS min_active_energy,
    ROUND(MAX(activeEnergyBurned)) AS max_active_energy,
    ROUND(SUM(activeEnergyBurned)) AS total_active_energy
FROM `activity_summaries`
WHERE dateComponents BETWEEN '2025-02-06' AND '2025-11-05'
GROUP BY DAYOFWEEK(dateComponents)
ORDER BY DAYOFWEEK(dateComponents);

SELECT
	userId,
    ROUND(AVG(activeEnergyBurned)) AS avg_active_energy,
    ROUND(STDDEV_POP(activeEnergyBurned)) AS stddev_active_energy,
    ROUND(COUNT(activeEnergyBurned)) AS count_active_energy,
    ROUND(MIN(activeEnergyBurned)) AS min_active_energy,
    ROUND(MAX(activeEnergyBurned)) AS max_active_energy,
    ROUND(SUM(activeEnergyBurned)) AS total_active_energy
FROM `activity_summaries`
WHERE dateComponents BETWEEN '2025-06-23' AND '2025-11-05'
GROUP BY userId;


SELECT ROUND(AVG(activeEnergyBurned)) AS avg_active_energy FROM `activity_summaries`
WHERE dateComponents BETWEEN '2025-06-23' AND '2025-11-04'
UNION SELECT ROUND(AVG(activeEnergyBurned)) AS avg_active_energy FROM `activity_summaries`
WHERE dateComponents >= '2025-11-05';

-- Normal Distribution Calculation Example
WITH stats AS (
    SELECT
        ROUND(AVG(activeEnergyBurned)) AS mean,
        ROUND(STDDEV_POP(activeEnergyBurned)) AS stddev
    FROM activity_summaries
), calculations AS (
    SELECT
        asu.userId,
        asu.activeEnergyBurned,
        s.mean,
        s.stddev,
        CASE
            WHEN s.stddev = 0 THEN 0
            ELSE (asu.activeEnergyBurned - s.mean) / s.stddev
        END AS z_score,
        CASE
            WHEN s.stddev = 0 THEN 0
            ELSE 0.5 * (1 + (
                SIGN((asu.activeEnergyBurned - s.mean) / (s.stddev * SQRT(2)))
                * SQRT(1 - EXP(
                    -1 * POWER((asu.activeEnergyBurned - s.mean) / (s.stddev * SQRT(2)), 2)
                    * (4 / PI() + 0.147 * POWER((asu.activeEnergyBurned - s.mean) / (s.stddev * SQRT(2)), 2))
                    / (1 + 0.147 * POWER((asu.activeEnergyBurned - s.mean) / (s.stddev * SQRT(2)), 2))
                ))
            ))
        END AS percentile_rank
    FROM activity_summaries asu
    CROSS JOIN stats s
)
SELECT * FROM calculations
ORDER BY userId, activeEnergyBurned;
