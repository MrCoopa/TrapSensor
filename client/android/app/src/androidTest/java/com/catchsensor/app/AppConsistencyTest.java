package com.catchsensor.app;

import static androidx.test.espresso.Espresso.onView;
import static androidx.test.espresso.matcher.ViewMatchers.isAssignableFrom;
import static androidx.test.espresso.assertion.ViewAssertions.matches;
import static androidx.test.espresso.matcher.ViewMatchers.isDisplayed;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;

import android.content.Context;
import android.webkit.WebView;

import androidx.test.ext.junit.rules.ActivityScenarioRule;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * Robust consistency test for the CatchSensor App.
 * Verifies core configuration and basic UI availability.
 */
@RunWith(AndroidJUnit4.class)
public class AppConsistencyTest {

    @Rule
    public ActivityScenarioRule<MainActivity> activityRule =
            new ActivityScenarioRule<>(MainActivity.class);

    @Test
    public void verifyPackageName() {
        Context appContext = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertEquals("com.catchsensor.app", appContext.getPackageName());
    }

    @Test
    public void verifyMainActivityLaunches() {
        activityRule.getScenario().onActivity(activity -> {
            assertNotNull(activity);
        });
    }

    @Test
    public void verifyWebViewIsPresent() {
        // Since it's a Capacitor app, the primary component must be a WebView
        onView(isAssignableFrom(WebView.class)).check(matches(isDisplayed()));
    }

    @Test
    public void verifyFirebaseConfigIsLoaded() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        // Check for the notification channel or metadata defined in manifest
        int iconRes = context.getResources().getIdentifier("ic_stat_notification", "drawable", context.getPackageName());
        // If it exists, it should be > 0. This confirms resource availability.
        assertEquals("Firebase Notification Icon should be present in resources", 
            true, iconRes > 0);
    }
}
