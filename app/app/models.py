from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    )

from sqlalchemy.ext.declarative import declarative_base

from sqlalchemy.orm import (
    scoped_session,
    sessionmaker,
    )

from zope.sqlalchemy import ZopeTransactionExtension

DBSession = scoped_session(sessionmaker(extension=ZopeTransactionExtension()))
Base = declarative_base()


class Progress(Base):
    __tablename__ = 'progress'
    id = Column(Integer, primary_key=True)
    total = Column(String)
    processed = Column(String)
    uuid = Column(String, index=True)
