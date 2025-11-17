from setuptools import setup, find_packages

setup(
    name="geomeditate",
    version="0.1.0",
    description="A hexagonal minesweeper where it's ok to make mistakes",
    packages=find_packages(),
    install_requires=[
        "pygame>=2.5.0",
    ],
    python_requires=">=3.8",
    entry_points={
        "console_scripts": [
            "geomeditate=geomeditate.game:main",
        ],
    },
)
