from loguru import logger


def setup_logging() -> None:
    logger.remove()
    logger.add(
        sink="stdout",
        level="INFO",
        backtrace=False,
        diagnose=False,
        enqueue=True,
        format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {message}",
    )

