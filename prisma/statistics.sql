-- Find users who have at least 7 days in a week with activeEnergyBurned >= 500, year-week basis
-- Initial query to identify candidate weeks
SELECT
    userId,
    MIN(dateComponents) as firstDay,
    MAX(dateComponents) as lastDay,
    YEARWEEK(dateComponents, 1) AS yearWeek,
    COUNT(*) AS activeDays
FROM activity_summaries
WHERE activeEnergyBurned >= 500
GROUP BY userId, yearWeek
HAVING COUNT(*) >= 7;

-- Streaks of 7 consecutive days with activeEnergyBurned >= 500
-- Intermediate query to find 7-day streaks
SELECT
    a.userId,
    a.dateComponents AS firstDate,
    DATE_ADD(a.dateComponents, INTERVAL 6 DAY) AS lastDate,
    SUM(b.activeEnergyBurned) AS totalCalories,
    COUNT(*) AS daysCount
FROM activity_summaries a
JOIN activity_summaries b
  ON a.userId = b.userId
 AND b.dateComponents BETWEEN a.dateComponents
                           AND DATE_ADD(a.dateComponents, INTERVAL 6 DAY)
 AND b.activeEnergyBurned >= 500
WHERE a.activeEnergyBurned >= 500
GROUP BY a.userId, a.dateComponents
HAVING COUNT(*) = 7;

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
    WHERE activeEnergyBurned >= 500 AND userId='0052fd53-6489-44e1-883b-0d467a589ebc'
    ORDER BY userId, dateComponents
) t
GROUP BY userId, FLOOR((rn-1)/7)
HAVING COUNT(*) = 7
ORDER BY diffDays DESC;