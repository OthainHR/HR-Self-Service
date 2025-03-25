from setuptools import setup, find_packages

setup(
    name="hr-self-service",
    version="0.1",
    packages=find_packages(),
    include_package_data=True,
    install_requires=[
        "fastapi",
        "uvicorn",
        "python-jose",
        "passlib",
        "python-multipart",
        "openai",
        "langchain",
        "pydantic",
        "python-dotenv",
        "supabase",
        "gunicorn",
    ],
) 