"""Test game initialization and screenshot generation."""

import os
os.environ['SDL_VIDEODRIVER'] = 'dummy'  # Use dummy video driver for headless testing

import pygame
from geomeditate.game import Game


def test_game_screenshot():
    """Test that game can initialize and create a screenshot."""
    print("Initializing game...")
    game = Game(grid_radius=4, difficulty=0.35)
    
    print("Rendering initial state...")
    game.render()
    
    # Save a screenshot
    screenshot_path = "/tmp/geomeditate_screenshot.png"
    pygame.image.save(game.renderer.screen, screenshot_path)
    print(f"Screenshot saved to {screenshot_path}")
    
    # Verify screenshot was created
    if os.path.exists(screenshot_path):
        print(f"Screenshot file size: {os.path.getsize(screenshot_path)} bytes")
        print("✓ Game initialization and rendering successful!")
    else:
        print("✗ Failed to create screenshot")
    
    game.cleanup()
    print("Game cleanup complete.")


if __name__ == "__main__":
    test_game_screenshot()
