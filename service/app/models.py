from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Index,
    DateTime
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
    site = Column(String, index=True)
    processed = Column(Integer)
    total = Column(Integer)
    valid_to = Column(DateTime, index=True)

class NetworkModel(Base):
    __tablename__ = 'network'
    id = Column(Integer, primary_key=True)
    site = Column(String, index=True)
    graph_data = Column(Text)
    graph_type = Column(String)
    valid_to = Column(DateTime, index=True)

 
