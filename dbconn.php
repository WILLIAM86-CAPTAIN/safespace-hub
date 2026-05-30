<?php
session_start();
$servername = "localhost";
$username = "root";
$password = "CAPTAINSAGE86";
$dbname = "safe_space";

// Create connection without database first to create it if needed
$conn = new mysqli($servername, $username, $password);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Create database if it doesn't exist
$sql = "CREATE DATABASE IF NOT EXISTS $dbname";
if ($conn->query($sql) === true) {
    // Database created successfully or already exists
} else {
    echo "Error creating database: " . $conn->error;
}

// Now connect to the database
$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
?>