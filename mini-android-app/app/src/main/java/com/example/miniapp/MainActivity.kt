package com.example.miniapp

import android.app.Activity
import android.os.Bundle
import android.graphics.Color
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        var count = 0

        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(48, 48, 48, 48)
        }

        val title = TextView(this).apply {
            text = "Meine Mini-App"
            textSize = 28f
            setTextColor(Color.DKGRAY)
            gravity = Gravity.CENTER
        }

        val description = TextView(this).apply {
            text = "Eine kleine Android-Beispiel-App."
            textSize = 18f
            gravity = Gravity.CENTER
            setPadding(0, 24, 0, 24)
        }

        val counter = TextView(this).apply {
            text = "Klicks: 0"
            textSize = 22f
            gravity = Gravity.CENTER
        }

        val button = Button(this).apply {
            text = "Klick mich"
            setOnClickListener {
                count++
                counter.text = "Klicks: $count"
            }
        }

        layout.addView(title)
        layout.addView(description)
        layout.addView(counter)
        layout.addView(button)

        setContentView(layout)
    }
}